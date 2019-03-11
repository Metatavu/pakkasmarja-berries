import { Application, Response, Request } from "express";
import * as Keycloak from "keycloak-connect";
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
    app.delete(`/rest/v1${this.toPath('/chatThreads/${encodeURIComponent(String(chatThreadId))}')}`, [ keycloak.protect() ], this.catchAsync(this.deleteChatThread.bind(this)));
    app.get(`/rest/v1${this.toPath('/chatThreads/${encodeURIComponent(String(chatThreadId))}')}`, [ keycloak.protect() ], this.catchAsync(this.findChatThread.bind(this)));
    app.get(`/rest/v1${this.toPath('/chatThreads/${encodeURIComponent(String(threadId))}/reports/${encodeURIComponent(String(type))}')}`, [ keycloak.protect() ], this.catchAsync(this.getChatThreadReport.bind(this)));
    app.get(`/rest/v1${this.toPath('/chatThreads')}`, [ keycloak.protect() ], this.catchAsync(this.listChatThreads.bind(this)));
    app.put(`/rest/v1${this.toPath('/chatThreads/${encodeURIComponent(String(chatThreadId))}')}`, [ keycloak.protect() ], this.catchAsync(this.updateChatThread.bind(this)));
  }


  /**
   * Creates new chat thread
   * @summary Creates new chat thread
   * Accepted parameters:
    * - (body) ChatThread body - Payload
  */
  public abstract createChatThread(req: Request, res: Response): Promise<void>;


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
   * Returns chat thread report
   * @summary Returns chat thread report
   * Accepted parameters:
    * - (path) number threadId - chat thread id
    * - (path) string type - report type. Accepted values summaryReport
    * - (header) string accept - Expected response format. Accepted values application/vnd.openxmlformats for Excel response
  */
  public abstract getChatThreadReport(req: Request, res: Response): Promise<void>;


  /**
   * Returns list of chat threads
   * @summary Returns list of chat threads
   * Accepted parameters:
    * - (query) number groupId - Filter chat threads by group id
    * - (query) ChatGroupType groupType - Filter chat groups by group type
  */
  public abstract listChatThreads(req: Request, res: Response): Promise<void>;


  /**
   * Update chat thread
   * @summary Update chat thread
   * Accepted parameters:
    * - (path) number chatThreadId - Chat thread id
  */
  public abstract updateChatThread(req: Request, res: Response): Promise<void>;

}