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

    app.get(`/rest/v1${this.toPath('/chatThreads/${encodeURIComponent(String(threadId))}/reports/${encodeURIComponent(String(type))}')}`, [ keycloak.protect() ], this.catchAsync(this.getChatThreadReport.bind(this)));
    app.get(`/rest/v1${this.toPath('/chatThreads')}`, [ keycloak.protect() ], this.catchAsync(this.listChatThreads.bind(this)));
  }


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
    * - (query) string originId - Filter chat threads by origin id
  */
  public abstract listChatThreads(req: Request, res: Response): Promise<void>;

}