import { Application, Response, Request } from "express";
import * as Keycloak from "keycloak-connect";
import models, { ProductModel, DeliveryPlaceModel, DeliveryQualityModel, DeliveryModel } from "../../models";
import * as _ from "lodash";
import { getLogger, Logger } from "log4js";
import slugify from "slugify";
import { Stream } from "stream";
import * as pug from "pug";
import ReportsService from "../api/reports.service";
import { Contact, DeliveryQuality, DeliveryPlace, Product, ItemGroupCategory, Address } from "../model/models";
import userManagement, { UserProperty } from "../../user-management";
import pdf from "../../pdf";
import UserRepresentation from "keycloak-admin/lib/defs/userRepresentation";
import * as moment from "moment";

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
      await this.getDeliveriesReport(req, res, format, startDate, endDate, productIds);
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

    const deliveryPlaceMap: { [key: number]: DeliveryPlaceModel } = {};
    const deliveryPlaceIds = _.uniq(deliveries.map((delivery) => {
      return delivery.deliveryPlaceId;
    }));

    for (let i = 0; i < deliveryPlaceIds.length; i++) {
      const deliveryPlace = await models.findDeliveryPlaceById(deliveryPlaceIds[i]);
      deliveryPlaceMap[deliveryPlace.id] = deliveryPlace;;
    }

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
      .sortBy(obj => {
        return moment(obj.delivery.date).format("YYYY-MM-DD");
      })
      .groupBy(obj => {
        const date = moment(obj.delivery.date).format("DD.MM.YYYY");
        const deliveryPlaceId = obj.delivery.deliveryPlaceId;
        return `${date}-${deliveryPlaceId}`;
      })
      .map((constructedDeliveries) => {
        const delivery = constructedDeliveries[0].delivery;
        const deliveryPlaceId = delivery.deliveryPlaceId;
        const deliveryDate = moment(delivery.date).format("DD.MM.YYYY");

        return {
          date: deliveryDate,
          deliveryPlace: deliveryPlaceMap[deliveryPlaceId].name,
          deliveries: _.sortBy(constructedDeliveries, (constructedDelivery) => {
            return constructedDelivery.delivery.date.toString();
          })
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
    
    const reportData = {
      contact: this.translateContact(contact),
      dateNow: moment().format("DD.MM.YYYY"),
      startDate: moment(startDateString.substr(0, startDateString.indexOf('T'))).format("DD.MM.YYYY"),
      endDate: moment(endDateString.substr(0, endDateString.indexOf('T'))).format("DD.MM.YYYY"),
      alv0:  _.sumBy(constructedDeliveries, obj => Number(obj.totalPrice)).toFixed(2),
      alv14: _.sumBy(constructedDeliveries, obj => Number(obj.totalPriceAlv14)).toFixed(2),
      deliveryPlaces: _.uniqBy(constructedDeliveries.map(contructedDelivery => { return contructedDelivery.deliveryPlace.name }), 'name').join(", "),
      groupedDeliveriesByDate: groupedByDateConstructedDeliveries,
      productTotals: productTotals
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;

    switch (format) {
      case "HTML":
        this.getDeliveriesReportHtml(baseUrl, reportData)
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
      break;
      case "PDF":
        this.getDeliveriesReportPdf(baseUrl, reportData)
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
   * Renders report document as HTML
   * 
   * @param baseUrl baseUrl
   * @param reportData report data
   * @return report
   */
  private async getDeliveriesReportHtml(baseUrl: string, reportData: any): Promise<HtmlDeliveriesReportData> {
    const content: string | null = await this.renderPugTemplate("delivery-report-content.pug", baseUrl, reportData);
    if (!content) {
      throw new Error("Failed to render report HTML");
    }

    const documentName = "Otsikko";
    const documentSlug = this.getDocumentSlug(documentName);
    return {
      documentName: documentName,
      filename: `${documentSlug}.html`,
      content: content,
      type: "text/html"
    };
  }

  /**
   * Renders report document as HTML
   * 
   * @param baseUrl baseUrl
   * @param reportData report data
   * @return report
   */
  private async getDeliveriesReportPdf(baseUrl: string, reportData: any): Promise<PdfDeliveriesReport | null> {
    const deliveriesHtmlReport: HtmlDeliveriesReportData | null = await this.getDeliveriesReportHtml(baseUrl, reportData);
    const header = null;
    const footer = await this.renderPugTemplate("delivery-report-footer.pug", baseUrl, reportData);
    const dataStream = await pdf.renderPdf(deliveriesHtmlReport.content, header, footer, baseUrl);

    return {
      documentName: deliveriesHtmlReport.documentName,
      filename: `${deliveriesHtmlReport.documentSlug}`,
      dataStream: dataStream,
      type: "application/pdf"
    };
  }

  /**
   * Renders a pug template
   * 
   * @param {String} template template name
   * @param {Object} model model
   * @return {String} rendered HTML
   */
  private renderPugTemplate(template: string, baseUrl: string, model: any) {
    const compiledPug = pug.compileFile(`${__dirname}/../../../templates/${template}`);
    return compiledPug({ ... model, baseUrl: baseUrl });
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
      "qualityId": delivery.qualityId,
      "deliveryPlaceId": delivery.deliveryPlaceId
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
  private resolveKeycloakUserAddresses(user: any): Address[] {
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