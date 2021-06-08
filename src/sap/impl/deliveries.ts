import moment = require("moment");
import { createStackedReject } from "../../utils";
import { config } from "../../config";
import models, { DeliveryModel, DeliveryPlaceModel, ProductModel } from "../../models";
import { DeliveryLoan } from "../../rest/model/deliveryLoan";
import SapServiceFactory from "../service-layer-client";
import { BinActionTypeEnum, SapDocObjectCodeEnum, SapStockTransferLine } from "../service-layer-client/types";
import _ = require("lodash");
import mailer from "../../mailer";

/**
 * Class for SAP deliveries service implementation
 */
export default class SapDeliveriesServiceImpl {

  /**
   * Create delivery purchase receipt to SAP
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
  static createDeliveryPurchaseReceiptToSap = async (
    delivery: DeliveryModel,
    product: ProductModel,
    deliveryPlace: DeliveryPlaceModel,
    unitPriceWithBonus: number,
    deliveryContactSapId: string,
    sapSalesPersonCode: string,
    itemGroupCategory: string
  ): Promise<void> => {
    const deliveryComments = await SapDeliveriesServiceImpl.getNotesString(delivery.id);

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
          U_PFZ_REF: SapDeliveriesServiceImpl.compressUUID(delivery.id!)
        }]
      });
    } catch (error) {
      if (itemGroupCategory === "FRESH") {
        const foundConfig = config();

        if (
          foundConfig.contacts &&
          foundConfig.contacts.notifications &&
          foundConfig.contacts.notifications.errors &&
          foundConfig.contacts.notifications.errors.fresh
        ) {
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
            foundConfig.contacts.notifications.errors.fresh,
            "Appi-toimituksen vienti SAP:iin epäonnistui",
            description,
            error instanceof Error ? error.stack || error.message : error.toString()
          );
        }
      }

      return Promise.reject(createStackedReject("Failed to create delivery purchase receipt to SAP", error));
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
    delivery: DeliveryModel,
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
        DocDate: moment(delivery.time).format("YYYY-MM-DD"),
        CardCode: deliveryContactSapId,
        Comments: await SapDeliveriesServiceImpl.getNotesString(delivery.id),
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
   * @param deliveryId delivery ID
   * @return constructed notes string
   */
  static getNotesString = async (deliveryId: string | null) => {
    if (!deliveryId) {
      return "";
    }

    const deliveryNotes = await models.listDeliveryNotes(deliveryId);
    const constructedNote = deliveryNotes.reduce((previous, { text }) => {
      if (text) {
        return previous ? `${previous} ; ${text}` : text;
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
}