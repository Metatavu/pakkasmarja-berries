import { Application, Response, Request } from "express";
import * as Keycloak from "keycloak-connect";
import models, { DeliveryQualityModel } from "../../models";
import DeliveryQualitiesService from "../api/deliveryQualities.service";

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
    const itemGroupCategory = req.query.itemGroupCategory;

    if (!itemGroupCategory) {
      this.sendBadRequest(res, "Missing required param itemGroupCategory");
      return;
    }

    const deliveryQualities = await models.listDeliveryQualities(itemGroupCategory);
    res.status(200).send(await Promise.all(deliveryQualities.map((deliveryQuality) => {
      return this.translateDatabaseDeliveryQuality(deliveryQuality);
    })));
  }

  /**
   * Translates database deliveryQuality into REST entity
   * 
   * @param deliveryQuality deliveryQuality 
   */
  private async translateDatabaseDeliveryQuality(deliveryQuality: DeliveryQualityModel) {
    const result: DeliveryQualityModel = {
      id: deliveryQuality.id,
      itemGroupCategory: deliveryQuality.itemGroupCategory,
      name: deliveryQuality.name,
      priceBonus: deliveryQuality.priceBonus,
      color: deliveryQuality.color
    };

    return result;
  }

}