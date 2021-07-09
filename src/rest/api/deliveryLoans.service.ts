import { Application, Response, Request } from "express";
import * as Keycloak from "keycloak-connect";
import AbstractService from "../abstract-service";

export default abstract class DeliveryLoansService extends AbstractService {

  /**
   * Constructor
   * 
   * @param app Express app
   * @param keycloak Keycloak
   */
  constructor(app: Application, keycloak: Keycloak) {
    super();

    app.post(`/rest/v1${this.toPath('/deliveryLoans')}`, [ keycloak.protect() ], this.catchAsync(this.createDeliveryLoan.bind(this)));
  }


  /**
   * Creates delivery loan
   * @summary Create delivery loan
   * Accepted parameters:
    * - (body) DeliveryLoan body - Payload
  */
  public abstract createDeliveryLoan(req: Request, res: Response): Promise<void>;

}