import { Application, Response, Request } from "express";
import * as Keycloak from "keycloak-connect";
import models, { ProductModel, DeliveryPlaceModel } from "../../models";
import * as _ from "lodash";
import { getLogger, Logger } from "log4js";
import slugify from "slugify";
import { Stream } from "stream";
import * as pug from "pug";
import ReportsService from "../api/reports.service";
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

interface DeliveryReportDataDelivery {
  time: string,
  amount: string,
  totalPrice: string,
  totalPriceAlv14: string,
  deliveryQuality: string,
  unitPrice: string,
  unitPriceAlv14: string,
  kg: string,
  product: {
    sapItemCode: string,
    name: string,
    unitName: string
  }
}

interface DeliveryReportDataDeliveryGroup {
  date: string,
  deliveryPlace: string,
  deliveries: DeliveryReportDataDelivery[]
}

interface DeliveryReportDataProductTotal {
  productName: string,
  totalAmountUnits: string,
  unitName: string,
  totalAmountKgs: string
}

interface DeliveryReportData {
  dateNow: string | null,
  startDate: string | null,
  endDate: string | null,
  alv0: string,
  alv14: string,
  deliveryGroups: DeliveryReportDataDeliveryGroup[],
  productTotals: DeliveryReportDataProductTotal[],
  contact: {
    sapId: string | null,
    displayName: string | null,
    address: {
      streetAddress: string | null,
      postalCode: string | null,
      city: string | null
    }
  }
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
    const startDateParam = req.query.startDate as any;
    const endDateParam = req.query.endDate as any;
    const productIds = req.query.productIds ? (req.query.productIds as any).split(",") : null;

    if (!type) {
      this.sendNotFound(res, "Missing required param type");
      return;
    }

    if (!startDateParam) {
      this.sendNotFound(res, "Missing required param startDate");
      return;
    }

    if (!endDateParam) {
      this.sendNotFound(res, "Missing required param endDate");
      return;
    }

    const loggedUserId = this.getLoggedUserId(req);
    if (!loggedUserId) {
      this.sendNotFound(res, "Could not find logged user");
      return;
    }

    const contact = await userManagement.findUser(loggedUserId);
    if (!contact) {
      this.sendNotFound(res, "Could not find logged user");
      return;
    }

    const startDate = this.parseDate(startDateParam);
    const endDate = this.parseDate(endDateParam);

    let reportData = null;

    if (type === "deliveriesReport") {
      reportData = await this.getDeliveryReportData(contact, productIds, startDate, endDate);
    }

    switch (format) {
      case "HTML":
        this.getDeliveriesReportHtml(reportData)
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
        this.getDeliveriesReportPdf(reportData)
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
   * Parses a date string
   *
   * @param date date
   * @return moment
   */
  private parseDate = (date: string) => {
    return moment(date.substr(0, date.indexOf('T')));
  }

  /**
   * Generates report data for delivery report
   *
   * @param user user
   * @param productIds product ids
   * @param startDate start date
   * @param endDate end date
   * @return report data
   */
  private async getDeliveryReportData(user: UserRepresentation, productIds: string[] | null, startDate: moment.Moment, endDate: moment.Moment): Promise<DeliveryReportData> {
    const deliveries = await models.listDeliveries("DONE", user.id!,  null, null,  productIds, null, endDate.toDate(), startDate.toDate(), null, null);

    const deliveryPlaceMap: { [key: number]: DeliveryPlaceModel } = {};
    const deliveryPlaceIds = _.uniq(deliveries.map((delivery) => {
      return delivery.deliveryPlaceId;
    }));

    for (let i = 0; i < deliveryPlaceIds.length; i++) {
      const deliveryPlace = await models.findDeliveryPlaceById(deliveryPlaceIds[i]);
      deliveryPlaceMap[deliveryPlace.id] = deliveryPlace;;
    }

    const productMap: { [key: number]: ProductModel } = {};
    const deliveryProductIds = _.uniq(deliveries.map((delivery) => {
      return delivery.productId;
    }));

    for (let i = 0; i < deliveryProductIds.length; i++) {
      const product = await models.findProductById(deliveryProductIds[i]);
      productMap[product.id!] = product;
    }

    const deliveryQualities = await models.listDeliveryQualities();
    const deliveryQualityMap: { [key: number]: DeliveryPlaceModel } = {};
    for (let i = 0; i < deliveryQualities.length; i++) {
      const deliveryQuality = deliveryQualities[i];
      deliveryQualityMap[deliveryQuality.id!] = deliveryQuality;
    }

  const deliveryGroups: DeliveryReportDataDeliveryGroup[] = _.chain(deliveries)
    .sortBy(delivery => {
      return moment(delivery.createdAt).format("YYYY-MM-DD HH:mm");
    })
    .groupBy(delivery => {
      const date = moment(delivery.createdAt).format("DD.MM.YYYY");
      const deliveryPlaceId = delivery.deliveryPlaceId;
      return `${date}-${deliveryPlaceId}`;
    })
    .map((groupedDeliveries) => {
      const delivery = groupedDeliveries[0];
      const deliveryPlaceId = delivery.deliveryPlaceId;
      const deliveryDate = moment(delivery.createdAt).format("DD.MM.YYYY");

      const deliveries: DeliveryReportDataDelivery[] = groupedDeliveries.map((delivery) => {
        const product = productMap[delivery.productId];
        const unitPrice = delivery.unitPriceWithBonus || 0;
        const unitPriceAlv14 = unitPrice * 1.14;
        const totalPrice = delivery.amount * unitPrice;
        const totalPriceAlv14 = totalPrice * 1.14;
        const deliveryQuality = delivery.qualityId ? deliveryQualityMap[delivery.qualityId] : null;

        return {
          time: moment(delivery.createdAt).format("HH:mm"),
          amount: delivery.amount.toString(),
          totalPrice: totalPrice.toFixed(2),
          totalPriceAlv14: totalPriceAlv14.toFixed(2),
          deliveryQuality: deliveryQuality ? deliveryQuality.displayName : null,
          unitPrice: unitPrice.toFixed(2),
          unitPriceAlv14: unitPriceAlv14.toFixed(2),
          kg: (delivery.amount * (product.units * product.unitSize)).toString(),
          product: {
            sapItemCode: product.sapItemCode,
            name: product.name,
            unitName: product.unitName
          }
        }
      });

      return {
        date: deliveryDate,
        deliveryPlace: deliveryPlaceMap[deliveryPlaceId].name,
        deliveries: deliveries
      }
    }).value();

    const productTotals: DeliveryReportDataProductTotal[] = _.chain(deliveries)
      .groupBy(delivery => delivery.productId)
      .map((deliveries, productId) => {
        const product = productMap[productId];
        const totalAmountUnits = _.sumBy(deliveries, delivery => delivery.amount);
        const totalAmountKgs = _.sumBy(deliveries, delivery => delivery.amount * product.units * product.unitSize);

        return {
          productName: product.name,
          totalAmountUnits:  totalAmountUnits.toFixed(2),
          totalAmountKgs: totalAmountKgs.toFixed(2),
          unitName: product.unitName
        }
      }).value();

    const alv0 = _.sumBy(deliveries, delivery => delivery.unitPriceWithBonus || 0);
    const alv14 = alv0 * 1.14;

    return {
      alv0: alv0.toFixed(2),
      alv14: alv14.toFixed(2),
      contact: {
        address: {
          city: userManagement.getSingleAttribute(user, UserProperty.CITY_1),
          postalCode: userManagement.getSingleAttribute(user, UserProperty.POSTAL_CODE_1),
          streetAddress: userManagement.getSingleAttribute(user, UserProperty.STREET_1)
        },
        displayName: userManagement.getUserDisplayName(user),
        sapId: userManagement.getSingleAttribute(user, UserProperty.SAP_BUSINESS_PARTNER_CODE) || null
      },
      dateNow: moment().format("DD.MM.YYYY"),
      startDate: moment(startDate).format("DD.MM.YYYY"),
      endDate: moment(endDate).format("DD.MM.YYYY"),
      deliveryGroups: deliveryGroups,
      productTotals: productTotals
    }
  }

  /**
   * Renders report document as HTML
   *
   * @param baseUrl baseUrl
   * @param reportData report data
   * @return report
   */
  private async getDeliveriesReportHtml(reportData: any): Promise<HtmlDeliveriesReportData> {
    const content: string | null = await this.renderPugTemplate("delivery-report-content.pug", reportData);
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
  private async getDeliveriesReportPdf(reportData: any): Promise<PdfDeliveriesReport | null> {
    const deliveriesHtmlReport: HtmlDeliveriesReportData | null = await this.getDeliveriesReportHtml(reportData);
    const header = null;
    const footer = await this.renderPugTemplate("delivery-report-footer.pug", reportData);
    const dataStream = await pdf.renderPdf(deliveriesHtmlReport.content, header, footer);

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
  private renderPugTemplate(template: string, model: any) {
    const compiledPug = pug.compileFile(`${__dirname}/../../../templates/${template}`);
    return compiledPug(model);
  }

  /**
   * Returns URL-friendly document name
   *
   * @param {*} documentName
   */
  private getDocumentSlug(documentName: string): string {
    return slugify(documentName);
  }

}