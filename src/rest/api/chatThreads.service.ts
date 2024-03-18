import { Application, Response, Request } from "express";
import { Keycloak } from "keycloak-connect";
import AbstractService from "../abstract-service";

export default abstract class ChatThreadsService extends AbstractService {

  /**
   * Constructor
   * 
   * @param app Express app
   * @param keycloak Keycloak
   */
  constructor(app: Application, keycloak: Keycloak) {
    super();

    app.post(`/rest/v1${this.toPath('/chatThreads')}`, [ keycloak.protect() ], this.catchAsync(this.createChatThread.bind(this)));
    app.post(`/rest/v1${this.toPath('/chatThreads/${encodeURIComponent(String(chatThreadId))}/groupPermissions')}`, [ keycloak.protect() ], this.catchAsync(this.createChatThreadGroupPermissions.bind(this)));
    app.post(`/rest/v1${this.toPath('/chatThreads/${encodeURIComponent(String(chatThreadId))}/userPermissions')}`, [ keycloak.protect() ], this.catchAsync(this.createChatThreadUserPermission.bind(this)));
    app.delete(`/rest/v1${this.toPath('/chatThreads/${encodeURIComponent(String(chatThreadId))}')}`, [ keycloak.protect() ], this.catchAsync(this.deleteChatThread.bind(this)));
    app.get(`/rest/v1${this.toPath('/chatThreads/${encodeURIComponent(String(chatThreadId))}')}`, [ keycloak.protect() ], this.catchAsync(this.findChatThread.bind(this)));
    app.get(`/rest/v1${this.toPath('/chatThreads/${encodeURIComponent(String(chatThreadId))}/groupPermissions/${encodeURIComponent(String(permissionId))}')}`, [ keycloak.protect() ], this.catchAsync(this.findChatThreadGroupPermission.bind(this)));
    app.get(`/rest/v1${this.toPath('/chatThreads/${encodeURIComponent(String(chatThreadId))}/userPermissions/${encodeURIComponent(String(permissionId))}')}`, [ keycloak.protect() ], this.catchAsync(this.findChatThreadUserPermission.bind(this)));
    app.get(`/rest/v1${this.toPath('/chatThreads/${encodeURIComponent(String(threadId))}/reports/${encodeURIComponent(String(type))}')}`, [ keycloak.protect() ], this.catchAsync(this.getChatThreadReport.bind(this)));
    app.get(`/rest/v1${this.toPath('/chatThreads/${encodeURIComponent(String(chatThreadId))}/groupPermissions')}`, [ keycloak.protect() ], this.catchAsync(this.listChatThreadGroupPermissions.bind(this)));
    app.get(`/rest/v1${this.toPath('/chatThreads/${encodeURIComponent(String(chatThreadId))}/userPermissions')}`, [ keycloak.protect() ], this.catchAsync(this.listChatThreadUserPermissions.bind(this)));
    app.get(`/rest/v1${this.toPath('/chatThreads')}`, [ keycloak.protect() ], this.catchAsync(this.listChatThreads.bind(this)));
    app.put(`/rest/v1${this.toPath('/chatThreads/${encodeURIComponent(String(chatThreadId))}')}`, [ keycloak.protect() ], this.catchAsync(this.updateChatThread.bind(this)));
    app.put(`/rest/v1${this.toPath('/chatThreads/${encodeURIComponent(String(chatThreadId))}/groupPermissions/${encodeURIComponent(String(permissionId))}')}`, [ keycloak.protect() ], this.catchAsync(this.updateChatThreadGroupPermission.bind(this)));
    app.put(`/rest/v1${this.toPath('/chatThreads/${encodeURIComponent(String(chatThreadId))}/userPermissions/${encodeURIComponent(String(permissionId))}')}`, [ keycloak.protect() ], this.catchAsync(this.updateChatThreadUserPermission.bind(this)));
  }


  /**
   * Creates new chat thread
   * @summary Creates new chat thread
   * Accepted parameters:
    * - (body) ChatThread body - Payload
  */
  public abstract createChatThread(req: Request, res: Response): Promise<void>;


  /**
   * Creates new chat thread group permission
   * @summary Creates new chat thread group permission
   * Accepted parameters:
    * - (body) ChatThreadGroupPermission body - Payload
    * - (path) number chatThreadId - Chat thread id
  */
  public abstract createChatThreadGroupPermissions(req: Request, res: Response): Promise<void>;


  /**
   * Creates new chat thread user permission
   * @summary Creates new chat thread user permission
   * Accepted parameters:
    * - (body) ChatThreadUserPermission body - Payload
    * - (path) number chatThreadId - Chat thread id
  */
  public abstract createChatThreadUserPermission(req: Request, res: Response): Promise<void>;


  /**
   * Deletes chat thread
   * @summary Deletes chat thread
   * Accepted parameters:
    * - (path) number chatThreadId - Chat thread id
  */
  public abstract deleteChatThread(req: Request, res: Response): Promise<void>;


  /**
   * Returns chat thread
   * @summary Returns chat thread
   * Accepted parameters:
    * - (path) number chatThreadId - Chat thread id
  */
  public abstract findChatThread(req: Request, res: Response): Promise<void>;


  /**
   * Find chat thread group permission
   * @summary Find chat thread group permission
   * Accepted parameters:
    * - (path) number chatThreadId - Chat thread id
    * - (path) string permissionId - Permission id
  */
  public abstract findChatThreadGroupPermission(req: Request, res: Response): Promise<void>;


  /**
   * Find chat thread user permission
   * @summary Find chat thread user permission
   * Accepted parameters:
    * - (path) number chatThreadId - Chat thread id
    * - (path) string permissionId - Permission id
  */
  public abstract findChatThreadUserPermission(req: Request, res: Response): Promise<void>;


  /**
   * Returns chat thread report
   * @summary Returns chat thread report
   * Accepted parameters:
    * - (path) number threadId - chat thread id
    * - (path) string type - report type. Accepted values summaryReport
    * - (header) string accept - Expected response format. Accepted values application/vnd.openxmlformats for Excel response
  */
  public abstract getChatThreadReport(req: Request, res: Response): Promise<void>;


  /**
   * Returns list of chat thread group permissions
   * @summary Returns list of chat thread group permissions
   * Accepted parameters:
    * - (path) number chatThreadId - Chat thread id
  */
  public abstract listChatThreadGroupPermissions(req: Request, res: Response): Promise<void>;


  /**
   * Returns list of chat thread user permissions
   * @summary Returns list of chat thread user permissions
   * Accepted parameters:
    * - (path) number chatThreadId - Chat thread id
  */
  public abstract listChatThreadUserPermissions(req: Request, res: Response): Promise<void>;


  /**
   * Returns list of chat threads
   * @summary Returns list of chat threads
   * Accepted parameters:
    * - (query) number groupId - Filter chat threads by group id
    * - (query) ChatGroupType groupType - Filter chat treads by group type
    * - (query) string ownerId - Filter chat treads by owner id
  */
  public abstract listChatThreads(req: Request, res: Response): Promise<void>;


  /**
   * Update chat thread
   * @summary Update chat thread
   * Accepted parameters:
    * - (body) ChatThread body - Payload
    * - (path) number chatThreadId - Chat thread id
  */
  public abstract updateChatThread(req: Request, res: Response): Promise<void>;


  /**
   * Updates chat thread group permission
   * @summary Update chat thread group permission
   * Accepted parameters:
    * - (body) ChatThreadGroupPermission body - Payload
    * - (path) number chatThreadId - Chat thread id
    * - (path) string permissionId - Permission id
  */
  public abstract updateChatThreadGroupPermission(req: Request, res: Response): Promise<void>;


  /**
   * Updates chat thread user permission
   * @summary Update chat thread user permission
   * Accepted parameters:
    * - (body) ChatThreadUserPermission body - Payload
    * - (path) number chatThreadId - Chat thread id
    * - (path) string permissionId - Permission id
  */
  public abstract updateChatThreadUserPermission(req: Request, res: Response): Promise<void>;

}