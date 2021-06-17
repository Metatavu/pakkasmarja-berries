import moment = require("moment");
import { createStackedReject, logReject } from "../../utils";
import { config } from "../../config";
import models, { DeliveryModel, DeliveryPlaceModel, ProductModel } from "../../models";
import { DeliveryLoan } from "../../rest/model/deliveryLoan";
import SapServiceFactory from "../service-layer-client";
import { BatchNumber, BinActionTypeEnum, SapDocObjectCodeEnum, SapStockTransferLine } from "../service-layer-client/types";
import _ = require("lodash");
import mailer from "../../mailer";
import { getLogger } from "log4js";

/**
 * Class for SAP deliveries service implementation
 */
export default class SapDeliveriesServiceImpl {

  /**
   * Create purchase delivery note to SAP
   *
   * @param delivery delivery model
   * @param product product model
   * @param deliveryPlace delivery place model
   * @param unitPriceWithBonus unit price with bonus
   * @param deliveryContactSapId delivery contact SAP ID
   * @param sapSalesPersonCode SAP sales person code
   * @param itemGroupCategory item group category
   * @returns promise of successful creation
   */
  static createPurchaseDeliveryNoteToSap = async (
    delivery: DeliveryModel,
    product: ProductModel,
    deliveryPlace: DeliveryPlaceModel,
    unitPriceWithBonus: number,
    deliveryContactSapId: string,
    sapSalesPersonCode: string,
    itemGroupCategory: "FRESH" | "FROZEN"
  ): Promise<void> => {
    const batchProducts = config().sap.batchProducts;

    if (!batchProducts) {
      logReject("Batch products list not found from configuration", getLogger());
    }

    const batchNumbers: BatchNumber[] = [];
    if ((batchProducts || []).some(batchProduct => batchProduct === product.sapItemCode)) {
      batchNumbers.push({
        BatchNumber: `${moment(delivery.time).format("YYYYMMDD")}_${deliveryContactSapId}`,
        Quantity: delivery.amount
      });
    }

    const deliveryNotes = await models.listDeliveryNotes(delivery.id);
    const deliveryComments = await SapDeliveriesServiceImpl.getNotesString(deliveryNotes.map(note => note.text || ""));

    try {
      const sapPurchaseDeliveryNotesService = SapServiceFactory.getPurchaseDeliveryNotesService();
      await sapPurchaseDeliveryNotesService.createPurchaseDeliveryNote({
        DocObjectCode: SapDocObjectCodeEnum.PURCHASE_DELIVERY_NOTE,
        DocDate: moment(delivery.time).format("YYYY-MM-DD"),
        CardCode: deliveryContactSapId,
        Comments: deliveryComments,
        SalesPersonCode: parseInt(sapSalesPersonCode, 10),
        DocumentLines: [{
          ItemCode: product.sapItemCode,
          Quantity: delivery.amount,
          UnitPrice: unitPriceWithBonus,
          WarehouseCode: deliveryPlace.sapId == "01" && itemGroupCategory == "FRESH" ? "02" : deliveryPlace.sapId,
          U_PFZ_REF: SapDeliveriesServiceImpl.compressUUID(delivery.id!),
          BatchNumbers: batchNumbers
        }]
      });
    } catch (error) {
      const emailAddresses = SapDeliveriesServiceImpl.getErrorEmailAddresses(itemGroupCategory);

      if (emailAddresses) {
        const description: string[] = [];

        description.push(`
          Toimituksen tiedot:\n\n
          Päiväys: ${moment(delivery.time).format("DD.MM.YYYY [klo] HH.mm")}\n
          Viljelijän SAP-tunnus: ${deliveryContactSapId}\n
          Toimitetun marjan SAP-tunnus: ${product.sapItemCode}\n
          Toimitettu määrä: ${delivery.amount}\n
          Yksikköhinta: ${unitPriceWithBonus}\n
          Kommentti: ${deliveryComments || ""}
        `);

        SapDeliveriesServiceImpl.sendErrorMails(
          emailAddresses,
          "Appi-toimituksen vienti SAP:iin epäonnistui",
          description,
          error instanceof Error ? error.stack || error.message : error.toString()
        );
      } else {
        logReject("No error email sent from failed delivery purchase because email addresses are not configured", getLogger());
      }

      return Promise.reject(createStackedReject("Failed to create purchase delivery note to SAP", error));
    }
  }

  /**
   * Create stock transfer to SAP
   * 
   * @param delivery delivery
   * @param deliveryContactSapId CardCode of the Supplier
   * @param sapSalesPersonCode Receiving person code
   * @param loans loans
   * @return promise of successful creation
   */
  static createStockTransferToSap = async (
    docDate: Date,
    comments: string[],
    deliveryContactSapId: string,
    sapSalesPersonCode: string,
    loans: DeliveryLoan[]
  ): Promise<void> => {
    try {
      if (!loans.length) {
        return;
      }

      const loanWarehouseCode = "100";
      const stockTransferLines: SapStockTransferLine[] = [];

      loans.forEach(loan => {
        const itemCode = config().sap.loanProductIds[loan.item];

        const stockTransferLine: SapStockTransferLine = {
          ItemCode: itemCode,
          Quantity: null,
          FromWarehouseCode: loanWarehouseCode,
          WarehouseCode: loanWarehouseCode,
          StockTransferLinesBinAllocations: []
        };

        if (loan.returned > 0) {
          stockTransferLines.push({
            ...stockTransferLine,
            Quantity: loan.returned,
            StockTransferLinesBinAllocations: [
              {
                BinAbsEntry: 2,
                Quantity: loan.returned,
                BinActionType: BinActionTypeEnum.TO_WAREHOUSE,
              },
              {
                BinAbsEntry: 3,
                Quantity: loan.returned,
                BinActionType: BinActionTypeEnum.FROM_WAREHOUSE
              },
            ]
          });
        }

        if (loan.loaned > 0) {
          stockTransferLines.push({
            ...stockTransferLine,
            Quantity: loan.loaned,
            StockTransferLinesBinAllocations: [
              {
                BinAbsEntry: 3,
                Quantity: loan.loaned,
                BinActionType: BinActionTypeEnum.TO_WAREHOUSE
              },
              {
                BinAbsEntry: 2,
                Quantity: loan.loaned,
                BinActionType: BinActionTypeEnum.FROM_WAREHOUSE
              },
            ]
          });
        }
      });

      if (stockTransferLines.length < 1) {
        throw new Error(`Stock transfer lines could not be constructed from loans: ${JSON.stringify(loans, null, 2)}`);
      }

      const sapStockTransfersService = SapServiceFactory.getStockTransfersService();
      await sapStockTransfersService.createStockTransfer({
        DocDate: moment(docDate).format("YYYY-MM-DD"),
        CardCode: deliveryContactSapId,
        Comments: await SapDeliveriesServiceImpl.getNotesString(comments),
        SalesPersonCode: parseInt(sapSalesPersonCode, 10),
        FromWarehouse: loanWarehouseCode,
        ToWarehouse: loanWarehouseCode,
        StockTransferLines: stockTransferLines
      });
    } catch (error) {
      return Promise.reject(createStackedReject("Failed to create stock transfer to SAP", error));
    }
  }

  /**
   * Compresses uuid by stripping minus signs from the string
   * 
   * @param uuid uuid
   * @returns compressed uuid
   */
  static compressUUID = (uuid: string): string => {
    return uuid.replace(/\-/g, '');
  }

  /**
   * Get notes as string
   * 
   * @param comments list of comments
   * @return constructed notes string
   */
  static getNotesString = async (comments: string[]) => {
    const constructedNote = comments.reduce((previous, comment) => {
      if (comment) {
        return previous ? `${previous} ; ${comment}` : comment;
      } else {
        return previous;
      }
    }, "");

    return _.truncate(constructedNote, { "length": 253 });
  }

  /**
   * Send email messages about logged error
   *
   * @param recipients message recipients
   * @param subject message subject
   * @param description message description as list of paragraphs
   * @param errorStack possible error stack
   */
  static sendErrorMails = (
    recipients: string[],
    subject: string,
    description: string[],
    errorStack?: string
  ) => {
    const contentParts: string[] = Array.from(description);

    if (errorStack) {
      contentParts.push("===============================================");
      contentParts.push("Tekninen virhekooste:");
      contentParts.push(errorStack);
    }

    for (const recipient of recipients) {
      mailer.send(config().mail.sender, recipient, subject, contentParts.join("\n\n"));
    }
  }

  /**
   * Returns email addresses for error messages
   *
   * @param itemGroupCategory item group category
   * @returns list of email addresses or undefined if addresses are not found from configuration
   */
  static getErrorEmailAddresses = (itemGroupCategory: "FRESH" | "FROZEN"): string[] | undefined => {
    const { contacts } = config();
    if (!contacts) {
      return;
    }

    const { notifications } = contacts;
    if (!notifications) {
      return;
    }

    const { errors } = notifications;
    if (!errors) {
      return;
    }

    if (itemGroupCategory === "FRESH" && errors.fresh && errors.fresh.length) {
      return errors.fresh;
    }

    if (itemGroupCategory === "FROZEN" && errors.frozen && errors.frozen.length) {
      return errors.frozen;
    }

    return;
  }
}