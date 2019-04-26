import { Application, Response, Request } from "express";
import * as Keycloak from "keycloak-connect";
import models, { ProductModel } from "../../models";
import ProductsService from "../api/products.service";
import { Product } from "../model/models";
import ApplicationRoles from "../application-roles";
import * as uuid from "uuid/v4";

/**
 * Implementation for Products REST service
 */
export default class ProductsServiceImpl extends ProductsService {
  
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
  public async createProduct(req: Request, res: Response) {
    const itemGroupId = req.body.itemGroupId;
    if (!itemGroupId) {
      this.sendBadRequest(res, "Missing required param item group id");
      return;
    }

    const databaseItemGroup = await models.findItemGroupByExternalId(itemGroupId);
    if (!databaseItemGroup) {
      this.sendNotFound(res);
      return;
    }

    const loggedUserId = this.getLoggedUserId(req);
    if (!loggedUserId && !this.hasRealmRole(req, ApplicationRoles.CREATE_PRODUCTS)) {
      this.sendForbidden(res, "You have no permission to create product");
      return;
    }

    const payload: Product = req.body; 

    const name = payload.name;
    if (!name) {
      this.sendBadRequest(res, "Missing required param name");
      return;
    }

    const units = payload.units;
    if (!units) {
      this.sendBadRequest(res, "Missing required param units");
      return;
    }

    const unitSize = payload.unitSize;
    if (!unitSize) {
      this.sendBadRequest(res, "Missing required param unitSize");
      return;
    }

    const unitName = payload.unitName;
    if (!unitName) {
      this.sendBadRequest(res, "Missing required param unitName");
      return;
    }

    const sapItemCode = payload.sapItemCode;
    if (!sapItemCode) {
      this.sendBadRequest(res, "Missing required param sapItemCode");
      return;
    }

    const createdProduct = await models.createProduct(uuid(), databaseItemGroup.id, name, units, unitSize, unitName, sapItemCode);
    res.status(200).send(await this.translateDatabaseProduct(createdProduct));
  } 
  
  /**
   * @inheritdoc
   */
  public async deleteProduct(req: Request, res: Response) {
    const productId = req.params.productId;
    if (!productId) {
      this.sendBadRequest(res, "Missing required param id");
      return;
    }

    if (!this.hasRealmRole(req, ApplicationRoles.DELETE_PRODUCTS)) {
      this.sendForbidden(res, "You have no permission to delete product");
      return;
    }

    const product = models.findProductById(productId);
    if (!product) {
      this.sendNotFound(res);
    }

    await await models.deleteProductById(productId);
    res.status(204).send();
  }

  /**
   * @inheritdoc
   */
  public async findProduct(req: Request, res: Response) {
    const productId = req.params.productId;
    if (!productId) {
      this.sendBadRequest(res, "Missing required param productId");
      return;
    }

    const product = await models.findProductById(productId);
    if (!product) {
      this.sendNotFound(res);
    }

    res.status(200).send(await this.translateDatabaseProduct(product));
  }

  /**
   * @inheritdoc
   */
  public async listProducts(req: Request, res: Response) {
    const itemGroupId = req.query.itemGroupId || null;
    const itemGroupCategory = req.query.itemGroupCategory || null;
    const contractUserId = req.query.contractUserId || null;
    const firstResult = parseInt(req.query.firstResult) || 0;
    const maxResults = parseInt(req.query.maxResults) || 5;

    const databaseItemGroup = await models.findItemGroupByExternalId(itemGroupId);
    const databaseItemGroupId = databaseItemGroup ? databaseItemGroup.id : null;

    const loggedUserId = this.getLoggedUserId(req);
    if (contractUserId && loggedUserId !== contractUserId && !this.hasRealmRole(req, ApplicationRoles.LIST_OTHER_CONTRACT_PRODUCTS)) {
      this.sendForbidden(res, "You have no permission to list other users products");
      return;
    }

    const products: ProductModel[] = await models.listProducts(databaseItemGroupId, itemGroupCategory, contractUserId, firstResult, maxResults);
    res.status(200).send(await Promise.all(products.map((product) => {
      return this.translateDatabaseProduct(product);
    })));
  }

  /**
   * @inheritdoc
   */
  public async updateProduct(req: Request, res: Response) {
    const productId = req.params.productId;
    if (!productId) {
      this.sendBadRequest(res, "Missing required param productId");
      return;
    }

    const itemGroupId = req.body.itemGroupId;
    if (!itemGroupId) {
      this.sendBadRequest(res, "Missing required param item group id");
      return;
    }

    const databaseItemGroup = await models.findItemGroupByExternalId(itemGroupId);
    if (!databaseItemGroup) {
      this.sendNotFound(res);
      return;
    }

    const loggedUserId = this.getLoggedUserId(req);
    if (!loggedUserId && !this.hasRealmRole(req, ApplicationRoles.UPDATE_PRODUCTS)) {
      this.sendForbidden(res, "You have no permission to update product");
      return;
    }

    const payload: Product = req.body; 
    const name = payload.name;
    if (!name) {
      this.sendBadRequest(res, "Missing required param name");
      return;
    }

    const units = payload.units;
    if (!units) {
      this.sendBadRequest(res, "Missing required param units");
      return;
    }

    const unitSize = payload.unitSize;
    if (!unitSize) {
      this.sendBadRequest(res, "Missing required param unitSize");
      return;
    }

    const unitName = payload.unitName;
    if (!unitName) {
      this.sendBadRequest(res, "Missing required param unitName");
      return;
    }

    const sapItemCode = payload.sapItemCode;
    if (!sapItemCode) {
      this.sendBadRequest(res, "Missing required param sapItemCode");
      return;
    }

    await models.updateProduct(productId, databaseItemGroup.id, name, units, unitSize, unitName, sapItemCode);

    const product = await models.findProductById(productId);
    if (!product) {
      this.sendNotFound(res);
    }

    res.status(200).send(await this.translateDatabaseProduct(product));
  }

  /**
   * Translates database product into REST entity
   * 
   * @param product product 
   */
  private async translateDatabaseProduct(product: ProductModel) {
    const itemGroup = await models.findItemGroupById(product.itemGroupId);

    const result: Product = {
      "id": product.id,
      "itemGroupId": itemGroup.externalId,
      "name": product.name,
      "units": product.units,
      "unitSize": product.unitSize,
      "unitName": product.unitName,
      "sapItemCode": product.sapItemCode
    };

    return result;
  }

}