import SapBusinessPartnersService from "./services/businessPartners.service";
import SapItemGroupsService from "./services/itemGroups.service";

/**
 * Class for SAP client
 */
export default class SapClient {

  public listItemGroups = async () => new SapItemGroupsService().listItemGroups();

  public listBusinessPartners = async () => new SapBusinessPartnersService().listBusinessPartners();

}