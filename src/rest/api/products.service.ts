import { Application, Response, Request } from "express";
import * as Keycloak from "keycloak-connect";
import AbstractService from "../abstract-service";

export default abstract class ProductsService extends AbstractService {

  /**
   * Constructor
   * 
   * @param app Express app
   * @param keycloak Keycloak
   */
  constructor(app: Application, keycloak: Keycloak) {
    super();

    app.post(`/rest/v1${this.toPath('/products')}`, [ keycloak.protect() ], this.catchAsync(this.createProduct.bind(this)));
    app.delete(`/rest/v1${this.toPath('/products/${encodeURIComponent(String(productId))}')}`, [ keycloak.protect() ], this.catchAsync(this.deleteProduct.bind(this)));
    app.get(`/rest/v1${this.toPath('/products/${encodeURIComponent(String(productId))}')}`, [ keycloak.protect() ], this.catchAsync(this.findProduct.bind(this)));
    app.get(`/rest/v1${this.toPath('/products')}`, [ keycloak.protect() ], this.catchAsync(this.listProducts.bind(this)));
    app.put(`/rest/v1${this.toPath('/products/${encodeURIComponent(String(productId))}')}`, [ keycloak.protect() ], this.catchAsync(this.updateProduct.bind(this)));
  }


  /**
   * Creates product
   * @summary Create product
   * Accepted parameters:
    * - (body) Product body - Payload
  */
  public abstract createProduct(req: Request, res: Response): Promise<void>;


  /**
   * Deletes product
   * @summary Delete product
   * Accepted parameters:
    * - (path) string productId - product id id
  */
  public abstract deleteProduct(req: Request, res: Response): Promise<void>;


  /**
   * Finds product by id
   * @summary Find product
   * Accepted parameters:
    * - (path) string productId - product id id
  */
  public abstract findProduct(req: Request, res: Response): Promise<void>;


  /**
   * Lists products
   * @summary Lists products
   * Accepted parameters:
    * - (query) string itemGroupId - filter by item group id
    * - (query) ItemGroupCategory itemGroupCategory - filter by item group id
    * - (query) string contractUserId - output only products what specified user has contract in
    * - (query) number firstResult - Offset of first result. Defaults to 0
    * - (query) number maxResults - Max results. Defaults to 5
  */
  public abstract listProducts(req: Request, res: Response): Promise<void>;


  /**
   * Updates product
   * @summary Update product
   * Accepted parameters:
    * - (body) Product body - Payload
    * - (path) string productId - product id id
  */
  public abstract updateProduct(req: Request, res: Response): Promise<void>;

}