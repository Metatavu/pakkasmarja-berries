import { Application, Response, Request } from "express";
import * as Keycloak from "keycloak-connect";
import AbstractService from "../abstract-service";

export default abstract class ChatGroupsService extends AbstractService {

  /**
   * Constructor
   * 
   * @param app Express app
   * @param keycloak Keycloak
   */
  constructor(app: Application, keycloak: Keycloak) {
    super();

    app.post(`/rest/v1${this.toPath('/chatGroups')}`, [ keycloak.protect() ], this.catchAsync(this.createChatGroup.bind(this)));
    app.post(`/rest/v1${this.toPath('/chatGroups/${encodeURIComponent(String(chatGroupId))}/groupPermissions')}`, [ keycloak.protect() ], this.catchAsync(this.createChatGroupGroupPermissions.bind(this)));
    app.delete(`/rest/v1${this.toPath('/chatGroups/${encodeURIComponent(String(chatGroupId))}')}`, [ keycloak.protect() ], this.catchAsync(this.deleteChatGroup.bind(this)));
    app.delete(`/rest/v1${this.toPath('/chatGroups/${encodeURIComponent(String(chatGroupId))}/groupPermissions/${encodeURIComponent(String(permissionId))}')}`, [ keycloak.protect() ], this.catchAsync(this.deleteChatGroupGroupPermission.bind(this)));
    app.get(`/rest/v1${this.toPath('/chatGroups/${encodeURIComponent(String(chatGroupId))}')}`, [ keycloak.protect() ], this.catchAsync(this.findChatGroup.bind(this)));
    app.get(`/rest/v1${this.toPath('/chatGroups/${encodeURIComponent(String(chatGroupId))}/groupPermissions/${encodeURIComponent(String(permissionId))}')}`, [ keycloak.protect() ], this.catchAsync(this.findChatGroupGroupPermissions.bind(this)));
    app.get(`/rest/v1${this.toPath('/chatGroups/${encodeURIComponent(String(chatGroupId))}/groupPermissions')}`, [ keycloak.protect() ], this.catchAsync(this.listChatGroupGroupPermissions.bind(this)));
    app.get(`/rest/v1${this.toPath('/chatGroups')}`, [ keycloak.protect() ], this.catchAsync(this.listChatGroups.bind(this)));
    app.put(`/rest/v1${this.toPath('/chatGroups/${encodeURIComponent(String(chatGroupId))}')}`, [ keycloak.protect() ], this.catchAsync(this.updateChatGroup.bind(this)));
    app.put(`/rest/v1${this.toPath('/chatGroups/${encodeURIComponent(String(chatGroupId))}/groupPermissions/${encodeURIComponent(String(permissionId))}')}`, [ keycloak.protect() ], this.catchAsync(this.updateChatGroupGroupPermissions.bind(this)));
  }


  /**
   * Creates new chat group
   * @summary Creates new chat group
   * Accepted parameters:
    * - (body) ChatGroup body - Payload
  */
  public abstract createChatGroup(req: Request, res: Response): Promise<void>;


  /**
   * Creates new chat group group permission
   * @summary Creates new chat group group permission
   * Accepted parameters:
    * - (body) ChatGroupGroupPermission body - Payload
    * - (path) number chatGroupId - Chat group id
  */
  public abstract createChatGroupGroupPermissions(req: Request, res: Response): Promise<void>;


  /**
   * Deletes a chat group
   * @summary Deletes a chat group
   * Accepted parameters:
    * - (path) number chatGroupId - Chat group id
  */
  public abstract deleteChatGroup(req: Request, res: Response): Promise<void>;


  /**
   * Deletes chat group group permission
   * @summary Delete chat group group permission
   * Accepted parameters:
    * - (path) number chatGroupId - Chat group id
    * - (path) string permissionId - Permission id
  */
  public abstract deleteChatGroupGroupPermission(req: Request, res: Response): Promise<void>;


  /**
   * Returns a chat group
   * @summary Returns a chat group
   * Accepted parameters:
    * - (path) number chatGroupId - Chat group id
  */
  public abstract findChatGroup(req: Request, res: Response): Promise<void>;


  /**
   * Find chat group group permission
   * @summary Find chat group group permission
   * Accepted parameters:
    * - (path) number chatGroupId - Chat group id
    * - (path) string permissionId - Permission id
  */
  public abstract findChatGroupGroupPermissions(req: Request, res: Response): Promise<void>;


  /**
   * Returns list of chat group group permissions
   * @summary Returns list of chat group group permissions
   * Accepted parameters:
    * - (path) number chatGroupId - Chat group id
  */
  public abstract listChatGroupGroupPermissions(req: Request, res: Response): Promise<void>;


  /**
   * Returns list of chat groups
   * @summary Returns list of chat groups
   * Accepted parameters:
    * - (query) ChatGroupType groupType - Filter chat groups by group type
  */
  public abstract listChatGroups(req: Request, res: Response): Promise<void>;


  /**
   * Update chat group
   * @summary Update chat group
   * Accepted parameters:
    * - (body) ChatGroup body - Payload
    * - (path) number chatGroupId - Chat group id
  */
  public abstract updateChatGroup(req: Request, res: Response): Promise<void>;


  /**
   * Updates chat group group permission
   * @summary Update chat group group permission
   * Accepted parameters:
    * - (body) ChatGroupGroupPermission body - Payload
    * - (path) number chatGroupId - Chat group id
    * - (path) string permissionId - Permission id
  */
  public abstract updateChatGroupGroupPermissions(req: Request, res: Response): Promise<void>;

}