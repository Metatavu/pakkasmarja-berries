import SapBusinessPartnersService from "./services/businessPartners.service";
import SapContractsService from "./services/contracts.service";
import SapDeliveryPlacesService from "./services/deliveryPlaces.service";
import SapItemGroupsService from "./services/itemGroups.service";
import SapPurchaseDeliveryNotesService from "./services/purchaseDeliveryNotes.service";
import SapSapStockTransfersService from "./services/stockTransfers.service";

/**
 * Class for SAP service factory
 */
export default class SapServiceFactory {

  /** Returns new instance of SAP item groups service */
  public static getItemGroupsService = () => new SapItemGroupsService();

  /** Returns new instance of SAP business partners service */
  public static getBusinessPartnersService = () => new SapBusinessPartnersService();

  /** Returns new instance of SAP delivery places service */
  public static getDeliveryPlacesService = () => new SapDeliveryPlacesService();

  /** Returns new instance of SAP contracts service */
  public static getContractsService = () => new SapContractsService();

  /** Returns new instance of SAP purchase delivery notes service */
  public static getPurchaseDeliveryNotesService = () => new SapPurchaseDeliveryNotesService();

  /** Returns new instance of SAP stock transfers service */
  public static getStockTransfersService = () => new SapSapStockTransfersService();
}