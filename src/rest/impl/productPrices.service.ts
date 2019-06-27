import { Application, Response, Request } from "express";
import * as Keycloak from "keycloak-connect";
import models, { ProductPriceModel, ProductModel } from "../../models";
import ProductPricesService from "../api/productPrices.service";
import ApplicationRoles from "../application-roles";
import * as uuid from "uuid/v4";
import { ProductPrice } from "../model/models";

/**
 * Implementation for Products REST service
 */
export default class ProductPricesServiceImpl extends ProductPricesService {

  /**
   * Constructor
   * 
   * @param app Express app
   * @param keycloak Keycloak
   */
  constructor(app: Application, keycloak: Keycloak) {
    super(app, keycloak);
  }

  /**
   * @inheritdoc 
   */
  public async createProductPrice(req: Request, res: Response) {
    const productId = req.params.productId;
    const unit = req.body.unit;
    const price = req.body.price;

    if (!this.hasRealmRole(req, ApplicationRoles.MANAGE_PRODUCT_PRICES)) {
      this.sendForbidden(res, "You have no permission to create product price");
      return;
    }

    if (!productId) {
      this.sendBadRequest(res, "Missing required param productId");
      return;
    }

    if (!unit) {
      this.sendBadRequest(res, "Missing required param unit");
      return;
    }

    if (!price) {
      this.sendBadRequest(res, "Missing required param price");
      return;
    }

    const createdProductPrice: ProductPriceModel = await models.createProductPrice(uuid(), productId, unit, price);
    res.status(200).send(await this.translateDatabaseProductPrice(createdProductPrice));
  }

  /**
   * @inheritdoc 
   */
  public async deleteProductPrice(req: Request, res: Response) {
    const productId = req.params.productId;
    const productPriceId = req.params.productPriceId;

    if (!this.hasRealmRole(req, ApplicationRoles.MANAGE_PRODUCT_PRICES)) {
      this.sendForbidden(res, "You have no permission to delete product price");
      return;
    }

    if (!productId) {
      this.sendBadRequest(res, "Missing required param productId");
      return;
    }

    if (!productPriceId) {
      this.sendBadRequest(res, "Missing required param productPriceId");
      return;
    }

    await models.deleteProductPrice(productPriceId);
    res.status(204).send();
  }

  /**
   * @inheritdoc 
   */
  public async findProductPrice(req: Request, res: Response) {
    const productId = req.params.productId;
    const productPriceId = req.params.productPriceId;

    if (!productId) {
      this.sendBadRequest(res, "Missing required param productId");
      return;
    }

    if (!productPriceId) {
      this.sendBadRequest(res, "Missing required param productPriceId");
      return;
    }

    const foundProductPrice: ProductPriceModel = await models.findProductPrice(productPriceId);
    res.status(200).send(await this.translateDatabaseProductPrice(foundProductPrice));
  }

  /**
   * @inheritdoc 
   */
  public async listProductPrices(req: Request, res: Response) {
    const productId = req.params.productId;
    const sort = req.query.sort;
    const atTime = req.query.atTime;
    const firstResult = parseInt(req.query.firstResult) || 0;
    const maxResults = parseInt(req.query.maxResults) || 5;

    if (!productId) {
      this.sendBadRequest(res, "Missing required param productId");
      return;
    }

    const foundProduct: ProductModel = await models.findProductById(productId);
    if (!foundProduct) {
      this.sendBadRequest(res, "Missing required param productId");
      return;
    }

    let productPrices: ProductPriceModel[] = [];

    if(atTime){
      productPrices = await models.listProductPricesUntilTime(productId, atTime, sort || "CREATED_AT_DESC", firstResult, maxResults);
    }else{
      productPrices = await models.listProductPrices(productId, sort || "CREATED_AT_DESC", firstResult, maxResults);
    }

    res.status(200).send(await Promise.all(productPrices.map((productPrice) => {
      return this.translateDatabaseProductPrice(productPrice);
    })));
  }

  /**
   * @inheritdoc 
   */
  public async updateProductPrice(req: Request, res: Response) {
    const productId = req.params.productId;
    const productPriceId = req.params.productPriceId;
    const unit = req.body.unit;
    const price = req.body.price;

    if (!productId) {
      this.sendBadRequest(res, "Missing required param productId");
      return;
    }

    const foundProduct: ProductModel = await models.findProductById(productId);
    if (!foundProduct) {
      this.sendNotFound(res, "Product not found");
      return;
    }

    if (!unit) {
      this.sendBadRequest(res, "Missing required param unit");
      return;
    }

    if (!price) {
      this.sendBadRequest(res, "Missing required param price");
      return;
    }

    const foundProductPrice: ProductPriceModel = await models.findProductPrice(productPriceId);
    if (!foundProductPrice) {
      this.sendNotFound(res, "Product price not found");
      return;
    }

    await models.updateProductPrice(productPriceId, productId, unit, price);

    const updatedProductPrice: ProductPriceModel = await models.findProductPrice(productPriceId);
    const result = await this.translateDatabaseProductPrice(updatedProductPrice);
    res.status(200).send(result);
  }

  /**
   * Translates database product price into REST entity
   * 
   * @param productPrice productPrice 
   */
  private async translateDatabaseProductPrice(productPrice: ProductPriceModel) {
    const result: ProductPrice = {
      id: productPrice.id,
      productId: productPrice.productId,
      unit: productPrice.unit,
      price: productPrice.price,
      createdAt: this.truncateTime(productPrice.createdAt),
      updatedAt: this.truncateTime(productPrice.updatedAt),
    };

    return result;
  }

}