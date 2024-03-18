import { Application, Response, Request } from "express";
import { Keycloak } from "keycloak-connect";
import AbstractService from "../abstract-service";

export default abstract class ItemGroupsService extends AbstractService {

  /**
   * Constructor
   * 
   * @param app Express app
   * @param keycloak Keycloak
   */
  constructor(app: Application, keycloak: Keycloak) {
    super();

    app.post(`/rest/v1${this.toPath('/itemGroups')}`, [ keycloak.protect() ], this.catchAsync(this.createItemGroup.bind(this)));
    app.post(`/rest/v1${this.toPath('/itemGroups/${encodeURIComponent(String(itemGroupId))}/prices')}`, [ keycloak.protect() ], this.catchAsync(this.createItemGroupPrice.bind(this)));
    app.delete(`/rest/v1${this.toPath('/itemGroups/${encodeURIComponent(String(itemGroupId))}/prices/${encodeURIComponent(String(priceId))}')}`, [ keycloak.protect() ], this.catchAsync(this.deleteItemGroupPrice.bind(this)));
    app.get(`/rest/v1${this.toPath('/itemGroups/${encodeURIComponent(String(id))}')}`, [ keycloak.protect() ], this.catchAsync(this.findItemGroup.bind(this)));
    app.get(`/rest/v1${this.toPath('/itemGroups/${encodeURIComponent(String(itemGroupId))}/documentTemplates/${encodeURIComponent(String(id))}')}`, [ keycloak.protect() ], this.catchAsync(this.findItemGroupDocumentTemplate.bind(this)));
    app.get(`/rest/v1${this.toPath('/itemGroups/${encodeURIComponent(String(itemGroupId))}/prices/${encodeURIComponent(String(priceId))}')}`, [ keycloak.protect() ], this.catchAsync(this.findItemGroupPrice.bind(this)));
    app.get(`/rest/v1${this.toPath('/itemGroups/${encodeURIComponent(String(itemGroupId))}/documentTemplates')}`, [ keycloak.protect() ], this.catchAsync(this.listItemGroupDocumentTemplates.bind(this)));
    app.get(`/rest/v1${this.toPath('/itemGroups/${encodeURIComponent(String(itemGroupId))}/prices')}`, [ keycloak.protect() ], this.catchAsync(this.listItemGroupPrices.bind(this)));
    app.get(`/rest/v1${this.toPath('/itemGroups')}`, [ keycloak.protect() ], this.catchAsync(this.listItemGroups.bind(this)));
    app.put(`/rest/v1${this.toPath('/itemGroups/${encodeURIComponent(String(itemGroupId))}/documentTemplates/${encodeURIComponent(String(id))}')}`, [ keycloak.protect() ], this.catchAsync(this.updateItemGroupDocumentTemplate.bind(this)));
    app.put(`/rest/v1${this.toPath('/itemGroups/${encodeURIComponent(String(itemGroupId))}/prices/${encodeURIComponent(String(priceId))}')}`, [ keycloak.protect() ], this.catchAsync(this.updateItemGroupPrice.bind(this)));
  }


  /**
   * Creates item group
   * @summary Creates item group
   * Accepted parameters:
    * - (body) ItemGroup body - Payload
  */
  public abstract createItemGroup(req: Request, res: Response): Promise<void>;


  /**
   * Creates an item group price
   * @summary Creates item group price
   * Accepted parameters:
    * - (body) ItemGroupPrice body - Payload
    * - (path) string itemGroupId - item group id
  */
  public abstract createItemGroupPrice(req: Request, res: Response): Promise<void>;


  /**
   * Deletes an item group price
   * @summary Delete item group price
   * Accepted parameters:
    * - (path) string itemGroupId - item group id
    * - (path) string priceId - price id
  */
  public abstract deleteItemGroupPrice(req: Request, res: Response): Promise<void>;


  /**
   * Finds item group by id
   * @summary Find item group
   * Accepted parameters:
    * - (path) string id - item group id
  */
  public abstract findItemGroup(req: Request, res: Response): Promise<void>;


  /**
   * Finds item group template
   * @summary Find item group document template
   * Accepted parameters:
    * - (path) string itemGroupId - item group id
    * - (path) string id - template id
  */
  public abstract findItemGroupDocumentTemplate(req: Request, res: Response): Promise<void>;


  /**
   * Finds a item group price
   * @summary Find item group price
   * Accepted parameters:
    * - (path) string itemGroupId - item group id
    * - (path) string priceId - price id
  */
  public abstract findItemGroupPrice(req: Request, res: Response): Promise<void>;


  /**
   * Lists item group templates
   * @summary List item group document templates
   * Accepted parameters:
    * - (path) string itemGroupId - item group id
  */
  public abstract listItemGroupDocumentTemplates(req: Request, res: Response): Promise<void>;


  /**
   * Lists item group prices
   * @summary List item group prices
   * Accepted parameters:
    * - (path) string itemGroupId - item group id
    * - (query) string sortBy - sort by (YEAR)
    * - (query) string sortDir - sort direction (ASC, DESC)
    * - (query) number firstResult - Offset of first result. Defaults to 0
    * - (query) number maxResults - Max results. Defaults to 5
  */
  public abstract listItemGroupPrices(req: Request, res: Response): Promise<void>;


  /**
   * Lists item groups
   * @summary Lists item groups
   * Accepted parameters:
    * - (query) string contractUserId - contract user id
  */
  public abstract listItemGroups(req: Request, res: Response): Promise<void>;


  /**
   * Updated item group document template
   * @summary Updates item group document template
   * Accepted parameters:
    * - (body) ItemGroupDocumentTemplate body - Payload
    * - (path) string itemGroupId - item group id
    * - (path) string id - template id
  */
  public abstract updateItemGroupDocumentTemplate(req: Request, res: Response): Promise<void>;


  /**
   * Updates a item group price
   * @summary Update item group price
   * Accepted parameters:
    * - (body) ItemGroupPrice body - Payload
    * - (path) string itemGroupId - item group id
    * - (path) string priceId - price id
  */
  public abstract updateItemGroupPrice(req: Request, res: Response): Promise<void>;

}