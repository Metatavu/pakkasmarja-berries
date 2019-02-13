import { Application, Response, Request } from "express";
import * as Keycloak from "keycloak-connect";
import AbstractService from "../abstract-service";

/* tslint:disable */
import { BadRequest } from '../model/badRequest';
import { Forbidden } from '../model/forbidden';
import { InternalServerError } from '../model/internalServerError';
import { Operation } from '../model/operation';
/* tslint:enable */
export default abstract class OperationsService extends AbstractService {

  /**
   * Constructor
   * 
   * @param app Express app
   * @param keycloak Keycloak
   */
  constructor(app: Application, keycloak: Keycloak) {
    super();

    app.post(`/rest/v1${this.toPath('/operations')}`, [ keycloak.protect() ], this.catchAsync(this.createOperation.bind(this)));
  }


  /**
   * Creates new operation
   * @summary Creates new operation
   * Accepted parameters:
    * - (body) Operation body - Payload
  */
  public abstract createOperation(req: Request, res: Response): Promise<void>;

}