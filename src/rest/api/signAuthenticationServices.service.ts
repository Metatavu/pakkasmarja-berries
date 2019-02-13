import { Application, Response, Request } from "express";
import * as Keycloak from "keycloak-connect";
import AbstractService from "../abstract-service";

/* tslint:disable */
import { BadRequest } from '../model/badRequest';
import { Forbidden } from '../model/forbidden';
import { InternalServerError } from '../model/internalServerError';
import { SignAuthenticationService } from '../model/signAuthenticationService';
/* tslint:enable */
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