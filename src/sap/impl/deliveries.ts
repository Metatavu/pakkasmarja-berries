import moment = require("moment");
import { createStackedReject } from "../../utils";
import { config } from "../../config";
import models, { DeliveryModel, DeliveryPlaceModel, ProductModel } from "../../models";
import { DeliveryLoan } from "../../rest/model/deliveryLoan";
import SapServiceFactory from "../service-layer-client";
import { BinActionTypeEnum, SapDocObjectCodeEnum, SapPurchaseDeliveryNote, SapStockTransfer, SapStockTransferLine } from "../service-layer-client/types";
import _ = require("lodash");

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
    try {
      const sapPurchaseDeliveryNotesService = SapServiceFactory.getPurchaseDeliveryNotesService();
      await sapPurchaseDeliveryNotesService.createPurchaseDeliveryNote({
        DocObjectCode: SapDocObjectCodeEnum.PURCHASE_DELIVERY_NOTE,
        DocDate: moment(delivery.time).format("YYYY-MM-DD"),
        CardCode: deliveryContactSapId,
        Comments: await SapDeliveriesServiceImpl.getNotesString(delivery.id),
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
      if (loans.length < 1) {
        return;
      }

      const loadWarehouseCode = "100";
      const stockTransferLines: SapStockTransferLine[] = [];

      loans.forEach(loan => {
        const itemCode = config().sap.loanProductIds[loan.item];

        const stockTransferLine: SapStockTransferLine = {
          ItemCode: itemCode,
          Quantity: null,
          FromWarehouseCode: loadWarehouseCode,
          WarehouseCode: loadWarehouseCode,
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

      const sapStockTransfersService = SapServiceFactory.getStockTransfersService();
      await sapStockTransfersService.createStockTransfer({
        DocDate: moment(delivery.time).format("YYYY-MM-DD"),
        CardCode: deliveryContactSapId,
        Comments: await SapDeliveriesServiceImpl.getNotesString(delivery.id),
        SalesPersonCode: parseInt(sapSalesPersonCode, 10),
        FromWarehouse: loadWarehouseCode,
        ToWarehouse: loadWarehouseCode,
        StockTransferLines: stockTransferLines
      });
    } catch (e) {
      return Promise.reject(createStackedReject("Failed to create stock transfer to SAP", e));
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
   * @param deliveryId deliveryId
   * @return notes
   */
  static getNotesString = async (deliveryId: string | null) => {
    if (!deliveryId) {
      return "";
    }

    const deliveryNotes = await models.listDeliveryNotes(deliveryId);
    const notes = deliveryNotes.map((deliveryNote) => {
      return deliveryNote.text;
    });

    const notesJoined = notes.join(" ; ");

    return _.truncate(notesJoined, { "length": 253 });
  }
}