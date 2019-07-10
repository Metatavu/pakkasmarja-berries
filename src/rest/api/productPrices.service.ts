import { Application, Response, Request } from "express";
import * as Keycloak from "keycloak-connect";
import AbstractService from "../abstract-service";

export default abstract class ProductPricesService extends AbstractService {

  /**
   * Constructor
   * 
   * @param app Express app
   * @param keycloak Keycloak
   */
  constructor(app: Application, keycloak: Keycloak) {
    super();

    app.post(`/rest/v1${this.toPath('/products/${encodeURIComponent(String(productId))}/prices')}`, [ keycloak.protect() ], this.catchAsync(this.createProductPrice.bind(this)));
    app.delete(`/rest/v1${this.toPath('/products/${encodeURIComponent(String(productId))}/prices/${encodeURIComponent(String(productPriceId))}')}`, [ keycloak.protect() ], this.catchAsync(this.deleteProductPrice.bind(this)));
    app.get(`/rest/v1${this.toPath('/products/${encodeURIComponent(String(productId))}/prices/${encodeURIComponent(String(productPriceId))}')}`, [ keycloak.protect() ], this.catchAsync(this.findProductPrice.bind(this)));
    app.get(`/rest/v1${this.toPath('/products/${encodeURIComponent(String(productId))}/prices')}`, [ keycloak.protect() ], this.catchAsync(this.listProductPrices.bind(this)));
    app.put(`/rest/v1${this.toPath('/products/${encodeURIComponent(String(productId))}/prices/${encodeURIComponent(String(productPriceId))}')}`, [ keycloak.protect() ], this.catchAsync(this.updateProductPrice.bind(this)));
  }


  /**
   * Creates product price
   * @summary Create product price
   * Accepted parameters:
    * - (body) ProductPrice body - Payload
    * - (path) string productId - product id id
  */
  public abstract createProductPrice(req: Request, res: Response): Promise<void>;


  /**
   * Deletes product price
   * @summary Delete product price
   * Accepted parameters:
    * - (path) string productId - delivery id id
    * - (path) string productPriceId - delivery id id
  */
  public abstract deleteProductPrice(req: Request, res: Response): Promise<void>;


  /**
   * Finds product price
   * @summary Find product price
   * Accepted parameters:
    * - (path) string productId - product id
    * - (path) string productPriceId - product price id
  */
  public abstract findProductPrice(req: Request, res: Response): Promise<void>;


  /**
   * Lists product prices
   * @summary List product prices
   * Accepted parameters:
    * - (path) string productId - product id
    * - (query) string sort - sort
    * - (query) string atTime - sort
    * - (query) number firstResult - Offset of first result. Defaults to 0
    * - (query) number maxResults - Max results. Defaults to 5
  */
  public abstract listProductPrices(req: Request, res: Response): Promise<void>;


  /**
   * Updates product price
   * @summary Update product price
   * Accepted parameters:
    * - (body) ProductPrice body - Payload
    * - (path) string productId - product id id
    * - (path) string productPriceId - product price id
  */
  public abstract updateProductPrice(req: Request, res: Response): Promise<void>;

}