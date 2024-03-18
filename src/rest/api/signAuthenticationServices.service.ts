import { Application, Response, Request } from "express";
import { Keycloak } from "keycloak-connect";
import AbstractService from "../abstract-service";

export default abstract class SignAuthenticationServicesService extends AbstractService {

  /**
   * Constructor
   * 
   * @param app Express app
   * @param keycloak Keycloak
   */
  constructor(app: Application, keycloak: Keycloak) {
    super();

    app.get(`/rest/v1${this.toPath('/signAuthenticationServices')}`, [ keycloak.protect() ], this.catchAsync(this.listSignAuthenticationServices.bind(this)));
  }


  /**
   * List available sign authentication services
   * @summary List sign authentication services
   * Accepted parameters:
  */
  public abstract listSignAuthenticationServices(req: Request, res: Response): Promise<void>;

}