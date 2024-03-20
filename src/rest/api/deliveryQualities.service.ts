import { Application, Response, Request } from "express";
import { Keycloak } from "keycloak-connect";
import AbstractService from "../abstract-service";

export default abstract class DeliveryQualitiesService extends AbstractService {

  /**
   * Constructor
   * 
   * @param app Express app
   * @param keycloak Keycloak
   */
  constructor(app: Application, keycloak: Keycloak) {
    super();

    app.post(`/rest/v1${this.toPath('/deliveryQualities')}`, [ keycloak.protect() ], this.catchAsync(this.createDeliveryQuality.bind(this)));
    app.get(`/rest/v1${this.toPath('/deliveryQualities/${encodeURIComponent(String(deliveryQualityId))}')}`, [ keycloak.protect() ], this.catchAsync(this.findDeliveryQuality.bind(this)));
    app.get(`/rest/v1${this.toPath('/deliveryQualities')}`, [ keycloak.protect() ], this.catchAsync(this.listDeliveryQualities.bind(this)));
    app.put(`/rest/v1${this.toPath('/deliveryQualities/${encodeURIComponent(String(deliveryQualityId))}')}`, [ keycloak.protect() ], this.catchAsync(this.updateDeliveryQuality.bind(this)));
  }


  /**
   * Creates delivery quality
   * @summary Create delivery quality
   * Accepted parameters:
    * - (body) DeliveryQuality body - Payload
  */
  public abstract createDeliveryQuality(req: Request, res: Response): Promise<void>;


  /**
   * Finds delivery quality
   * @summary Find delivery quality
   * Accepted parameters:
    * - (path) string deliveryQualityId - delivery quality id
  */
  public abstract findDeliveryQuality(req: Request, res: Response): Promise<void>;


  /**
   * Lists delivery qualities
   * @summary Lists delivery qualities
   * Accepted parameters:
    * - (query) ItemGroupCategory itemGroupCategory - filter by item group category
    * - (query) string productId - filter by product Id
  */
  public abstract listDeliveryQualities(req: Request, res: Response): Promise<void>;


  /**
   * Updates delivery quality
   * @summary Update delivery quality
   * Accepted parameters:
    * - (body) DeliveryQuality body - Payload
    * - (path) string deliveryQualityId - delivery quality id
  */
  public abstract updateDeliveryQuality(req: Request, res: Response): Promise<void>;

}