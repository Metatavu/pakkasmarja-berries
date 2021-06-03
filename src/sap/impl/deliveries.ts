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
   * Create delivery documents to SAP
   * 
   * @param delivery delivery
   * @param product product
   * @param deliveryPlace delivery place
   * @param unitPriceWithBonus unit price with bonus
   * @param deliveryContactSapId CardCode of the Supplier
   * @param sapSalesPersonCode Receiving person code
   * @param loans loans
   * @param itemGroupCategory item group category
   * @return promise of successful creation
   */
  static createDeliveryDocumentsToSap = async (
    delivery: DeliveryModel,
    product: ProductModel,
    deliveryPlace: DeliveryPlaceModel,
    unitPriceWithBonus: number,
    deliveryContactSapId: string,
    sapSalesPersonCode: string,
    loans: DeliveryLoan[],
    itemGroupCategory: string
  ): Promise<void> => {
    try {
      const date: string = moment(delivery.time).format("YYYY-MM-DD");
      const notes = await SapDeliveriesServiceImpl.getNotesString(delivery.id);
      const sapItemCode = product.sapItemCode;
      const salesPersonCode = parseInt(sapSalesPersonCode, 10);
      const loanWarehouse = "100";
      const warehouseCode = deliveryPlace.sapId == "01" && itemGroupCategory == "FRESH" ? "02" : deliveryPlace.sapId;

      const purchaseDeliveryNote: SapPurchaseDeliveryNote = {
        DocObjectCode: SapDocObjectCodeEnum.PURCHASE_DELIVERY_NOTE,
        DocDate: date,
        CardCode: deliveryContactSapId,
        Comments: notes,
        SalesPersonCode: salesPersonCode,
        DocumentLines: [{
          ItemCode: sapItemCode,
          Quantity: delivery.amount,
          UnitPrice: unitPriceWithBonus,
          WarehouseCode: warehouseCode,
          U_PFZ_REF: SapDeliveriesServiceImpl.compressUUID(delivery.id!)
        }]
      };

      const sapPurchaseDeliveryNotesService = SapServiceFactory.getPurchaseDeliveryNotesService();
      await sapPurchaseDeliveryNotesService.createPurchaseDeliveryNote(purchaseDeliveryNote);

      if (loans.length < 1) {
        return;
      }

      const stockTransferLines: SapStockTransferLine[] = [];
      loans.forEach(loan => {
        const itemCode = config().sap.loanProductIds[loan.item];

        const stockTransferLine: SapStockTransferLine = {
          ItemCode: itemCode,
          Quantity: null,
          FromWarehouseCode: loanWarehouse,
          WarehouseCode: loanWarehouse,
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

      const stockTransfer: SapStockTransfer = {
        DocDate: date,
        CardCode: deliveryContactSapId,
        Comments: notes,
        SalesPersonCode: salesPersonCode,
        FromWarehouse: loanWarehouse,
        ToWarehouse: loanWarehouse,
        StockTransferLines: stockTransferLines
      };

      const sapStockTransfersService = SapServiceFactory.getStockTransfersService();
      await sapStockTransfersService.createStockTransfer(stockTransfer);
    } catch (e) {
      return Promise.reject(createStackedReject("Failed to create delivery documents to SAP", e));
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