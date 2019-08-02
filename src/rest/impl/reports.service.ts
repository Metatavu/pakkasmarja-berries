import { Application, Response, Request } from "express";
import * as Keycloak from "keycloak-connect";
import models, { ProductModel, DeliveryPlaceModel, DeliveryQualityModel, DeliveryModel } from "../../models";
import * as fs from "fs";
import * as _ from "lodash";
import { getLogger, Logger } from "log4js";
import slugify from "slugify";
import * as path from "path";
import { Stream } from "stream";
import * as Mustache from "mustache";
import * as pug from "pug";
import ReportsService from "../api/reports.service";
import { Contact, Delivery, DeliveryQuality, DeliveryPlace, Product, ItemGroupCategory, Address } from "../model/models";
import userManagement, { UserProperty } from "../../user-management";
import pdf from "../../pdf";
import UserRepresentation from "keycloak-admin/lib/defs/userRepresentation";
import moment = require("moment");

interface ConstructData {
  contact: Contact,
  deliveries: {
    delivery: Delivery,
    deliveryQuality: DeliveryQuality,
    deliveryPlace: DeliveryPlace,
    product: Product
  }[]
}

interface HtmlDeliveriesReportData {
  documentName: string,
  documentSlug?: string,
  filename: string,
  content: string,
  type: string
}

interface PdfDeliveriesReport {
  documentName: string,
  filename: string,
  dataStream?: Stream,
  type: string
}

/**
 * Implementation for Reports REST service
 */
export default class ReportsServiceImpl extends ReportsService {

  private logger: Logger;

  /**
   * Constructor
   * 
   * @param app Express app
   * @param keycloak Keycloak
   */
  constructor(app: Application, keycloak: Keycloak) {
    super(app, keycloak);
    this.logger = getLogger();
  }

  /**
   * @inheritdoc
   */
  public async getReport(req: Request, res: Response) {
    const type = req.params.type;
    const format = req.query.format;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const productIds = req.query.productIds ? req.query.productIds.split(",") : [];

    if (!type) {
      this.sendNotFound(res, "Missing required param type");
      return;
    }

    if (type === "deliveriesReport") {
      this.getDeliveriesReport(req, res, format, startDate, endDate, productIds);
    }

  }

  /**
   * Get deliveries Report
   * @param {Date} startDate startDate
   * @param {Date} endDate endDate
   * @param {String[]} productIds productIds
   */
  private async getDeliveriesReport(req: Request, res: Response, format: string, startDate: Date, endDate: Date, productIds: string[]) {
    if (!startDate) {
      this.sendNotFound(res, "Missing required param startDate");
      return;
    }

    if (!endDate) {
      this.sendNotFound(res, "Missing required param endDate");
      return;
    }

    const loggedUserId = this.getLoggedUserId(req);
    if (!loggedUserId) {
      this.sendNotFound(res, "Could not find logged user");
      return;
    }

    const deliveries = await models.listDeliveriesByDateAndProductIds("DONE", loggedUserId,  endDate, startDate, productIds);

    if (deliveries.length <= 0) {
      this.sendNotFound(res, "Did not find any deliveries");
      return;
    }

    const contact = await userManagement.findUser(loggedUserId);
    if (!contact) {
      this.sendNotFound(res, "Could not find logged user");
      return;
    }

    const constructedDeliveryPromises = deliveries.map(async deliveryModel => {
      const delivery = this.translateDatabaseDelivery(deliveryModel);
      const deliveryQualityModel = await models.findDeliveryQuality(delivery.qualityId || "");
      const deliveryQuality = await this.translateDatabaseDeliveryQuality(deliveryQualityModel);
      const deliveryPlaceModel = await models.findDeliveryPlaceById(deliveryModel.deliveryPlaceId);
      const deliveryPlace = this.translateDatabaseDeliveryPlace(deliveryPlaceModel);
      const productModel = await models.findProductById(delivery.productId);
      const product = await this.translateDatabaseProduct(productModel);
      const unitPriceAlv14 = (Number(delivery.price) * 1.14).toFixed(2);
      const kg = (delivery.amount * (product.units * product.unitSize)).toFixed(2);
      const totalPrice = (delivery.amount * Number(delivery.price)).toFixed(2);
      const totalPriceAlv14 = (Number(totalPrice) * 1.14).toFixed(2);
      return {
        delivery: delivery,
        deliveryQuality: deliveryQuality,
        deliveryPlace: deliveryPlace,
        product: product,
        kg: kg,
        unitPriceAlv14: unitPriceAlv14,
        totalPrice: totalPrice,
        totalPriceAlv14: totalPriceAlv14
      };
    });
    const constructedDeliveries = await Promise.all(constructedDeliveryPromises);

    const groupedByDateConstructedDeliveries = _.chain(constructedDeliveries)
    .groupBy(obj => moment(obj.delivery.date).format("DD.MM.YYYY"))
    .map((constructedDeliveries, i) => {
      return {
        date: i,
        deliveries: constructedDeliveries
      }
    }).value();

    const productTotals = _.chain(constructedDeliveries)
    .groupBy(constructedDelivery => constructedDelivery.product.name)
    .map((constructedDeliveries, productName) => {
      const totalAmountUnits = _.sumBy(constructedDeliveries, obj => Number(obj.delivery.amount));
      const totalAmountKgs = _.sumBy(constructedDeliveries, obj => Number(obj.delivery.amount) * (obj.product.units * obj.product.unitSize));
      const unitName = _.uniqBy( constructedDeliveries.map(constructedDelivery => constructedDelivery.product.unitName), 'unitName');
      return {
        productName: productName,
        totalAmountUnits:  totalAmountUnits,
        totalAmountKgs: totalAmountKgs,
        unitName: unitName
      } 
    }).value();

    const startDateString = startDate.toString();
    const endDateString = endDate.toString();
    
    const constructData = {
      contact: this.translateContact(contact),
      dateNow: moment().format("DD.MM.YYYY"),
      startDate: moment(startDateString.substr(0, startDateString.indexOf('T'))).format("DD.MM.YYYY"),
      endDate: moment(endDateString.substr(0, endDateString.indexOf('T'))).format("DD.MM.YYYY"),
      alv0:  _.sumBy(constructedDeliveries, obj => Number(obj.totalPrice)),
      alv14: _.sumBy(constructedDeliveries, obj => Number(obj.totalPriceAlv14)).toFixed(2),
      deliveryPlaces: _.uniqBy(constructedDeliveries.map(contructedDelivery => { return contructedDelivery.deliveryPlace.name }), 'name').join(", "),
      groupedDeliveriesByDate: groupedByDateConstructedDeliveries,
      productTotals: productTotals
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;

    switch (format) {
      case "HTML":
        this.getDeliveriesReportHtml(baseUrl, constructData)
          .then((document) => {
            if (!document) {
              this.sendNotFound(res, "Document not found");
            } else {
              res.setHeader("Content-type", "text/html");
              res.send(document);
            }
          })
          .catch((err) => {
            this.logger.error(`Html rendering failed on ${err}`);
            this.sendInternalServerError(res, err);
          });
        return;
        break;
      case "PDF":
        this.getDeliveriesReportPdf(baseUrl, constructData)
          .then((document) => {
            if (!document) {
              this.sendNotFound(res);
            } else {
              res.setHeader("Content-Type", "application/pdf");
              res.setHeader("Content-Disposition", `attachment; filename=${document.filename}`);
              if (document.dataStream) {
                document.dataStream.pipe(res);
              } else {
                res.send(document.dataStream);
              }
            }
          })
          .catch((err) => {
            this.logger.error(`PDF Rendering failed on ${err}`);
            this.sendInternalServerError(res, err);
          });
      break;
    }
  }

  /**
   * Renders contract document as HTML
   * 
   * @param {String} baseUrl baseUrl
   * @param {Contract} contract contract
   * @param {String} type document type 
   */
  private async getDeliveriesReportHtml(baseUrl: string, data: any): Promise<HtmlDeliveriesReportData | null> {
    try {

      const html = "<div>{{>deliveryRaportHeader}} {{>deliveryRaportBody}} {{>deliveryRaportFooter}}</div>";
      const content: string | null = await this.renderDocumentTemplateComponent(baseUrl, html, "delivery-report-content.pug", data);
      if (!content) {
        return null;
      }

      const documentName = "Otsikko";
      const documentSlug = this.getDocumentSlug(documentName);
      return {
        documentName: documentName,
        filename: `${documentSlug}.html`,
        content: content,
        type: "text/html"
      };
    } catch (e) {
      this.logger.error("Failed to generate contract document html", e);
      return null;
    }
  }

  /**
 * Renders contract document as HTML
 * 
 * @param {String} baseUrl baseUrl
 * @param {Contract} contract contract
 * @param {String} type document type 
 */
  async getDeliveriesReportPdf(baseUrl: string, data: any): Promise<PdfDeliveriesReport | null> {

    const deliveriesHtmlReport: HtmlDeliveriesReportData | null = await this.getDeliveriesReportHtml(baseUrl, data);
    if (!deliveriesHtmlReport) {
      return null;
    }

    const dataStream = await pdf.renderPdf(deliveriesHtmlReport.content, null, null, baseUrl);
    return {
      documentName: deliveriesHtmlReport.documentName,
      filename: `${deliveriesHtmlReport.documentSlug}`,
      dataStream: dataStream,
      type: "application/pdf"
    };
  }

  /**
   * Renders a document template component into HTML text
   * 
   * @param {String} baseurl base url
   * @param {String} mustacheTemplate mustache template
   * @param {String} pugTemplateName pug template name
   * @param {Object} mustacheData data passed to Mustache renderer
   * @return {String} rendered HTML
   */
  private async renderDocumentTemplateComponent(baseUrl: string, mustacheTemplate: string, pugTemplateName: string, mustacheData: any): Promise<string | null> {
    if (!mustacheTemplate) {
      return null;
    }

    const mustachePartials = await this.loadMustachePartials();
    const preprosessedMustacheTemplate = await this.preprosessMustacheTemplate(mustacheTemplate);

    const bodyContent = Mustache.render(preprosessedMustacheTemplate,
      mustacheData,
      mustachePartials
    );

    return this.renderPugTemplate(pugTemplateName, {
      bodyContent: bodyContent,
      baseUrl: baseUrl
    });
  }


  private async loadMustachePartials() {
    const result = {};
    const partialFiles = await this.getMustachePartialFiles();
    const partials = await Promise.all(partialFiles.map((partialFile) => {
      return this.loadMustachePartial(partialFile);
    }));

    partialFiles.forEach((partialFile: string, index: number) => {
      const partialName = path.basename(partialFile, ".mustache");
      result[partialName] = partials[index];
    });

    return result;
  }

  private loadMustachePartial(file: string): Promise<string> {
    return new Promise((resolve, reject) => {
      fs.readFile(file, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data.toString());
        }
      });
    });
  }

  private getMustachePartialFiles(): Promise<string[]> {
    const folder = `${__dirname}/../../../mustache/`;

    return new Promise((resolve, reject) => {
      fs.readdir(folder, (err: Error, files: string[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(files.map((file: string) => {
            return `${folder}/${file}`;
          }));
        }
      });
    });
  }

  /**
   * Preprosesses mustache template.
   * 
   * @param {String} template mustache template 
   */
  private async preprosessMustacheTemplate(template: string) {
    const partials = (await this.getMustachePartialFiles()).map((partialFile: string) => {
      return path.basename(partialFile, ".mustache");
    });

    partials.forEach((partial) => {
      template = template.replace(new RegExp("[{]{2,3}[\\s]{0,}" + partial + "[\\s]{0,}[}]{2,3}", "gi"), `{{ > ${partial} }}`);
    });

    return template;
  }

  /**
   * Renders a pug template
   * 
   * @param {String} template template name
   * @param {Object} model model
   * @return {String} rendered HTML
   */
  private renderPugTemplate(template: string, model: { bodyContent: string, baseUrl: string }) {
    const compiledPug = pug.compileFile(`${__dirname}/../../../templates/${template}`);
    return compiledPug(model);
  }

  /**
   * Slugifys document name 
   * 
   * @param {*} documentName 
   */
  private getDocumentSlug(documentName: string): string {
    return slugify(documentName);
  }

  /**
   * Translates database product into REST entity
   * 
   * @param product product 
   */
  private async translateDatabaseProduct(product: ProductModel) {
    const itemGroup = await models.findItemGroupById(product.itemGroupId);

    const result: Product = {
      "id": product.id,
      "itemGroupId": itemGroup.externalId,
      "name": product.name,
      "units": product.units,
      "unitSize": product.unitSize,
      "unitName": product.unitName,
      "sapItemCode": product.sapItemCode
    };

    return result;
  }

  /**
   * Translates Database delivery place into REST entity
   * 
   * @param {Object} deliveryPlace Sequelize delivery place model
   * @return {DeliveryPlace} REST entity
   */
  private translateDatabaseDeliveryPlace(deliveryPlace: DeliveryPlaceModel): DeliveryPlace {
    const result: DeliveryPlace = {
      "id": deliveryPlace.externalId,
      "name": deliveryPlace.name
    };

    return result;
  }

  /**
   * Translates database deliveryQuality into REST entity
   * 
   * @param deliveryQuality deliveryQuality 
   */
  private async translateDatabaseDeliveryQuality(deliveryQuality: DeliveryQualityModel) : Promise<DeliveryQuality | null> {
    if (!deliveryQuality.id) {
      return null;
    }
  
    const result: DeliveryQuality = {
      id: deliveryQuality.id,
      itemGroupCategory: (deliveryQuality.itemGroupCategory as ItemGroupCategory),
      name: deliveryQuality.name,
      priceBonus: deliveryQuality.priceBonus,
      color: deliveryQuality.color,
      displayName: deliveryQuality.displayName,
      deliveryQualityProductIds: []
    };
  
    return result;
  }

  /**
   * Translates database delivery into REST entity
   * 
   * @param delivery delivery 
   */
  private translateDatabaseDelivery(delivery: DeliveryModel) {

    const result = {
      "id": delivery.id,
      "productId": delivery.productId,
      "date": delivery.time,
      "time": moment(delivery.time).format("HH:mm"),
      "status": delivery.status,
      "amount": delivery.amount,
      "price": delivery.unitPriceWithBonus ? delivery.unitPriceWithBonus.toFixed(2) : null,
      "qualityId": delivery.qualityId
    };

    return result;
  }

  /**
   * Translates Keycloak user into Contact
   * 
   * @param {Object} user Keycloak user
   * @return {Contact} contact 
   */
  private translateContact(user: UserRepresentation | null): Contact | null {
    if (!user || !user.id) {
      return null;
    }

    try {
      const userVatLiable: string | null = userManagement.getSingleAttribute(user, UserProperty.VAT_LIABLE);
      let vatLiable: Contact.VatLiableEnum | null = null;

      if ("true" == userVatLiable) {
        vatLiable = userVatLiable;
      } else if ("false" == userVatLiable) {
        vatLiable = userVatLiable;
      } else if ("EU" == userVatLiable) {
        vatLiable = userVatLiable;
      }

      const result: Contact = {
        'id': user.id,
        "sapId": userManagement.getSingleAttribute(user, UserProperty.SAP_ID) ||null,
        'firstName': user.firstName || null,
        'lastName': user.lastName || null,
        'companyName': userManagement.getSingleAttribute(user, UserProperty.COMPANY_NAME) || null,
        'phoneNumbers': this.resolveKeycloakUserPhones(user),
        'email': user.email || null,
        'addresses': this.resolveKeycloakUserAddresses(user),
        'BIC': userManagement.getSingleAttribute(user, UserProperty.BIC) || null,
        'IBAN': userManagement.getSingleAttribute(user, UserProperty.IBAN) || null,
        'taxCode': userManagement.getSingleAttribute(user, UserProperty.TAX_CODE) || null,
        'vatLiable': vatLiable,
        'audit': userManagement.getSingleAttribute(user, UserProperty.AUDIT) || null,
        "avatarUrl": userManagement.getUserImage(user),
        "displayName": userManagement.getUserDisplayName(user)
      };
      
      return result;
    } catch (e) {
      this.logger.error("Failed to translate contact", user);
      return null;
    }
  }

  /**
   * Resolves Keycloak user's phone numbers
   * 
   * @param {Object} user
   * @return {String[]} array of phone numbers
   */
  private resolveKeycloakUserPhones(user: any) {
    const result = [];
    if (user && user.attributes) {
      const phoneNumber1 = userManagement.getSingleAttribute(user, UserProperty.PHONE_1);
      const phoneNumber2 = userManagement.getSingleAttribute(user, UserProperty.PHONE_2);
      
      if (phoneNumber1) {
        result.push(phoneNumber1);
      }

      if (phoneNumber2) {
        result.push(phoneNumber2);
      }
    }
    
    return _.compact(result);
  }

  /**
   * Resolves Keycloak user's addresses
   * 
   * @param {Object} user
   * @return {Address[]} array of addresses
   */
  resolveKeycloakUserAddresses(user: any): Address[] {
    const result: Address[] = [];
    if (user && user.attributes) {
      const postalCode1 = userManagement.getSingleAttribute(user, UserProperty.POSTAL_CODE_1);
      const streetAddress1 = userManagement.getSingleAttribute(user, UserProperty.STREET_1);
      const city1 = userManagement.getSingleAttribute(user, UserProperty.CITY_1);

      const postalCode2 = userManagement.getSingleAttribute(user, UserProperty.POSTAL_CODE_2);
      const streetAddress2 = userManagement.getSingleAttribute(user, UserProperty.STREET_2);
      const city2 = userManagement.getSingleAttribute(user, UserProperty.CITY_2);

      if (postalCode1 && streetAddress1) {
        const address: Address = {
          "streetAddress": streetAddress1,
          "postalCode": postalCode1,
          "city": city1 || null
        };

        result.push(address);  
      } 

      if (postalCode2 && streetAddress2) {
        const address: Address = {
          "streetAddress": streetAddress1,
          "postalCode": postalCode1,
          "city": city2 || null
        };

        result.push(address);  
      } 
    }
    
    return result;
  }

}