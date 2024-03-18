import { Application, Response, Request } from "express";
import { Keycloak } from "keycloak-connect";
import AbstractService from "../abstract-service";

export default abstract class UserGroupsService extends AbstractService {

  /**
   * Constructor
   * 
   * @param app Express app
   * @param keycloak Keycloak
   */
  constructor(app: Application, keycloak: Keycloak) {
    super();

    app.get(`/rest/v1${this.toPath('/userGroups')}`, [ keycloak.protect() ], this.catchAsync(this.listUserGroups.bind(this)));
  }


  /**
   * Lists user groups
   * @summary Lists user groups
   * Accepted parameters:
  */
  public abstract listUserGroups(req: Request, res: Response): Promise<void>;

}