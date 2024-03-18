import { Application, Response, Request } from "express";
import { Keycloak } from "keycloak-connect";
import AbstractService from "../abstract-service";

export default abstract class UnreadsService extends AbstractService {

  /**
   * Constructor
   * 
   * @param app Express app
   * @param keycloak Keycloak
   */
  constructor(app: Application, keycloak: Keycloak) {
    super();

    app.delete(`/rest/v1${this.toPath('/unreads/${encodeURIComponent(String(unreadId))}')}`, [ keycloak.protect() ], this.catchAsync(this.deleteUnread.bind(this)));
    app.get(`/rest/v1${this.toPath('/unreads')}`, [ keycloak.protect() ], this.catchAsync(this.listUnreads.bind(this)));
  }


  /**
   * Deletes unread
   * @summary Delete unread
   * Accepted parameters:
    * - (path) string unreadId - unread id
  */
  public abstract deleteUnread(req: Request, res: Response): Promise<void>;


  /**
   * Lists unreads
   * @summary Lists unreads
   * Accepted parameters:
    * - (query) string pathPrefix - filter unreads by path prefix
    * - (query) string userId - filter unreads by userId
  */
  public abstract listUnreads(req: Request, res: Response): Promise<void>;

}