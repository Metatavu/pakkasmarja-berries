import { Application, Response, Request } from "express";
import { Keycloak } from "keycloak-connect";
import models, { DeliveryQualityModel, DeliveryQualityProductModel } from "../../models";
import DeliveryQualitiesService from "../api/deliveryQualities.service";
import ApplicationRoles from "../application-roles";
import { DeliveryQuality, ItemGroupCategory } from "../model/models";
import uuid = require("uuid");

/**
 * Implementation for Products REST service
 */
export default class DeliveryQualitiesServiceImpl extends DeliveryQualitiesService {

  /**
   * Constructor
   *
   * @param app Express app
   * @param keycloak Keycloak
   */
  constructor(app: Application, keycloak: Keycloak) {
    super(app, keycloak);
  }

  public async listDeliveryQualities(req: Request, res: Response) {
    const itemGroupCategory = req.query.itemGroupCategory as any;
    const productId = req.query.productId as any;

    const deliveryQualities = await models.listDeliveryQualities(itemGroupCategory, productId);
    res.status(200).send(await Promise.all(deliveryQualities.map((deliveryQuality) => {
      return this.translateDatabaseDeliveryQuality(deliveryQuality);
    })));
  }

  /**
   * @inheritdoc
   */
  public async createDeliveryQuality(req: Request, res: Response) {
    const payload : DeliveryQuality = req.body;
    if (!payload) {
      this.sendBadRequest(res, "Missing required payload");
      return;
    }

    const loggedUserId = this.getLoggedUserId(req);
    if (!loggedUserId && !this.hasRealmRole(req, ApplicationRoles.MANAGE_DELIVERY_QUALITIES)) {
      this.sendForbidden(res, "You have no permission to manage delivery qualities");
      return;
    }

    const name = payload.name;
    if (!name) {
      this.sendBadRequest(res, "Missing required param name");
      return;
    }

    const displayName = payload.displayName;
    if (!displayName) {
      this.sendBadRequest(res, "Missing required param display name");
      return;
    }

    const color = payload.color;
    if (!color) {
      this.sendBadRequest(res, "Missing required param color");
      return;
    }

    const deliveryQualityProductIds = payload.deliveryQualityProductIds;
    if (!deliveryQualityProductIds) {
      this.sendBadRequest(res, "Missing required param deliveryQualityProductIds");
      return;
    }

    const itemGroupCategory = payload.itemGroupCategory;
    if (!itemGroupCategory) {
      this.sendBadRequest(res, "Missing required param itemGroupCategory");
      return;
    }

    const priceBonus = payload.priceBonus;
    if (priceBonus === null) {
      this.sendBadRequest(res, "Missing required param priceBonus");
      return;
    }

    const createdDeliveryQuality = await models.createDeliveryQuality(uuid(), itemGroupCategory, name, displayName, priceBonus, color);
    const createDeliveryQualityProductPromises = (payload.deliveryQualityProductIds || []).map((productId) => {
      return models.createDeliveryQualityProduct(createdDeliveryQuality.id || "", productId);
    });
    await Promise.all(createDeliveryQualityProductPromises);

    res.status(200).send(await this.translateDatabaseDeliveryQuality(createdDeliveryQuality));
  }

  /**
   * @inheritdoc
   */
  public async updateDeliveryQuality(req: Request, res: Response) {
    const deliveryQualityId = req.params.deliveryQualityId;
    if (!deliveryQualityId) {
      this.sendBadRequest(res, "Missing required param deliveryQualityId");
      return;
    }

    const payload: DeliveryQuality = req.body;
    if (!payload) {
      this.sendBadRequest(res, "Missing required payload");
      return;
    }

    const loggedUserId = this.getLoggedUserId(req);
    if (!loggedUserId && !this.hasRealmRole(req, ApplicationRoles.MANAGE_DELIVERY_QUALITIES)) {
      this.sendForbidden(res, "You have no permission to manage delivery qualities");
      return;
    }

    const name = payload.name;
    if (!name) {
      this.sendBadRequest(res, "Missing required param name");
      return;
    }

    const displayName = payload.displayName;
    if (!displayName) {
      this.sendBadRequest(res, "Missing required param display name");
      return;
    }

    const color = payload.color;
    if (!color) {
      this.sendBadRequest(res, "Missing required param color");
      return;
    }

    const deliveryQualityProductIds = payload.deliveryQualityProductIds;
    if (!deliveryQualityProductIds) {
      this.sendBadRequest(res, "Missing required param deliveryQualityProductIds");
      return;
    }

    const itemGroupCategory = payload.itemGroupCategory;
    if (!itemGroupCategory) {
      this.sendBadRequest(res, "Missing required param itemGroupCategory");
      return;
    }

    const priceBonus = payload.priceBonus;
    if (priceBonus === null) {
      this.sendBadRequest(res, "Missing required param priceBonus");
      return;
    }

    await models.updateDeliveryQuality(deliveryQualityId, itemGroupCategory, name, displayName, priceBonus, color);

    const deliveryQuality = await models.findDeliveryQuality(deliveryQualityId);
    if (!deliveryQuality) {
      this.sendNotFound(res);
      return;
    }

    const qualityProducts = await models.listQualityProductsByDeliveryQualityId(deliveryQualityId);
    const existingDeliveryQualityProductIds = qualityProducts.map((deliveryQualityIds) => {
      return deliveryQualityIds.productId;
    });

    const payloadQualityProductIds = payload.deliveryQualityProductIds || [];

    for (let i = 0; i < payloadQualityProductIds.length; i++) {
      const payloadQualityProductId = payloadQualityProductIds[i];
      const existingIndex = existingDeliveryQualityProductIds.indexOf(payloadQualityProductId);

      if (existingIndex > -1) {
        existingDeliveryQualityProductIds.splice(existingIndex, 1);
      } else {
        await models.createDeliveryQualityProduct(deliveryQualityId, payloadQualityProductId);
      }
    }

    for (let i = 0; i < existingDeliveryQualityProductIds.length; i++) {
      const existingQualityProductId = existingDeliveryQualityProductIds[i];
      await models.deleteDeliveryQualityProduct(deliveryQualityId, existingQualityProductId);
    }

    res.status(200).send(await this.translateDatabaseDeliveryQuality(deliveryQuality));
  }

  /**
   * @inheritdoc
   */
  public async findDeliveryQuality(req: Request, res: Response) {
    const deliveryQualityId = req.params.deliveryQualityId;
    if (!deliveryQualityId) {
      this.sendBadRequest(res, "Missing required param deliveryQualityId");
      return;
    }

    const deliveryQuality = await models.findDeliveryQuality(deliveryQualityId);
    if (!deliveryQuality) {
      this.sendNotFound(res);
      return;
    }

    res.status(200).send(await this.translateDatabaseDeliveryQuality(deliveryQuality));
  }

  /**
   * Translates database deliveryQuality into REST entity
   *
   * @param deliveryQuality deliveryQuality
   */
  private async translateDatabaseDeliveryQuality(deliveryQuality: DeliveryQualityModel) : Promise<DeliveryQuality | null> {
  if (!deliveryQuality.id) {
    return null;
  }

  const deliveryQualityProducts : DeliveryQualityProductModel[] = await models.listQualityProductsByDeliveryQualityId(deliveryQuality.id);
  const deliveryQualityProductIds = deliveryQualityProducts.length < 1 ? [] : deliveryQualityProducts.map((deliveryQualityProduct) => {
    return deliveryQualityProduct.productId;
  });

    const result: DeliveryQuality = {
      id: deliveryQuality.id,
      itemGroupCategory: (deliveryQuality.itemGroupCategory as ItemGroupCategory),
      name: deliveryQuality.name,
      priceBonus: deliveryQuality.priceBonus,
      color: deliveryQuality.color,
      displayName: deliveryQuality.displayName,
      deliveryQualityProductIds: deliveryQualityProductIds
    };

    return result;
  }

}