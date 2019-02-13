import * as Keycloak from "keycloak-connect";
import { Response, Request, Application } from "express";
import DeliveryPlacesService from "../api/deliveryPlaces.service";
import { getLogger, Logger } from "log4js";
import { DeliveryPlace } from "../model/models";
import models, { DeliveryPlaceModel } from "../../models";

/**
 * Implementation for DeliveryPlaces REST service
 */
export default class DeliveryPlacesServiceImpl extends DeliveryPlacesService {
  
  private logger: Logger;

  /**
   * Constructor
   * 
   * @param app Express app
   * @param keycloak Keycloak
   */
  constructor(app: Application, keycloak: Keycloak) {
    super(app, keycloak);
    this.logger = getLogger();
  }
  
  async findDeliveryPlace(req: Request, res: Response) {
    const deliveryPlaceId = req.params.id;
    if (!deliveryPlaceId) {
      this.sendNotFound(res);
      return;
    }
    
    const databaseDeliveryPlace = await models.findDeliveryPlaceByExternalId(deliveryPlaceId);
    if (!databaseDeliveryPlace) {
      this.sendNotFound(res);
      return;
    }
    
    res.status(200).send(this.translateDatabaseDeliveryPlace(databaseDeliveryPlace));
  }
  
  /**
   * @inheritdoc
   */
  async listDeliveryPlaces(req: Request, res: Response) {
    const databaseDeliveryPlaces = await models.listDeliveryPlaces();
    const deliveryPlaces = databaseDeliveryPlaces.map((databaseDeliveryPlace) => {
      return this.translateDatabaseDeliveryPlace(databaseDeliveryPlace);
    });
    
    res.status(200).send(deliveryPlaces);
  }
  
  /**
   * Translates Database delivery place into REST entity
   * 
   * @param {Object} deliveryPlace Sequelize delivery place model
   * @return {DeliveryPlace} REST entity
   */
  translateDatabaseDeliveryPlace(deliveryPlace: DeliveryPlaceModel): DeliveryPlace {
    const result: DeliveryPlace = {
      "id": deliveryPlace.externalId,
      "name": deliveryPlace.name
    };

    return result;
  }
}