import { Application, Response, Request } from "express";
import { Keycloak } from "keycloak-connect";
import AbstractService from "../abstract-service";

export default abstract class DeliveryPlacesService extends AbstractService {

  /**
   * Constructor
   * 
   * @param app Express app
   * @param keycloak Keycloak
   */
  constructor(app: Application, keycloak: Keycloak) {
    super();

    app.get(`/rest/v1${this.toPath('/deliveryPlaces/${encodeURIComponent(String(id))}')}`, [ keycloak.protect() ], this.catchAsync(this.findDeliveryPlace.bind(this)));
    app.get(`/rest/v1${this.toPath('/deliveryPlaces')}`, [ keycloak.protect() ], this.catchAsync(this.listDeliveryPlaces.bind(this)));
  }


  /**
   * Finds delivery place by id
   * @summary Find delivery place
   * Accepted parameters:
    * - (path) string id - delivery place id
  */
  public abstract findDeliveryPlace(req: Request, res: Response): Promise<void>;


  /**
   * Lists delivery places
   * @summary Lists delivery places
   * Accepted parameters:
  */
  public abstract listDeliveryPlaces(req: Request, res: Response): Promise<void>;

}