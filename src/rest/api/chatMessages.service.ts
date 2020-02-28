import { Application, Response, Request } from "express";
import * as Keycloak from "keycloak-connect";
import AbstractService from "../abstract-service";

export default abstract class ChatMessagesService extends AbstractService {

  /**
   * Constructor
   * 
   * @param app Express app
   * @param keycloak Keycloak
   */
  constructor(app: Application, keycloak: Keycloak) {
    super();

    app.post(`/rest/v1${this.toPath('/chatThreads/${encodeURIComponent(String(chatThreadId))}/messages')}`, [ keycloak.protect() ], this.catchAsync(this.createChatMessage.bind(this)));
    app.delete(`/rest/v1${this.toPath('/chatThreads/${encodeURIComponent(String(chatThreadId))}/messages/${encodeURIComponent(String(messageId))}')}`, [ keycloak.protect() ], this.catchAsync(this.deleteChatMessage.bind(this)));
    app.get(`/rest/v1${this.toPath('/chatThreads/${encodeURIComponent(String(chatThreadId))}/messages/${encodeURIComponent(String(messageId))}')}`, [ keycloak.protect() ], this.catchAsync(this.findChatMessage.bind(this)));
    app.get(`/rest/v1${this.toPath('/chatThreads/${encodeURIComponent(String(chatThreadId))}/messages/${encodeURIComponent(String(messageId))}/read')}`, [ keycloak.protect() ], this.catchAsync(this.getMessageRead.bind(this)));
    app.get(`/rest/v1${this.toPath('/chatThreads/${encodeURIComponent(String(chatThreadId))}/messages/${encodeURIComponent(String(messageId))}/read/amount')}`, [ keycloak.protect() ], this.catchAsync(this.getMessageReadAmount.bind(this)));
    app.get(`/rest/v1${this.toPath('/chatThreads/${encodeURIComponent(String(chatThreadId))}/messages')}`, [ keycloak.protect() ], this.catchAsync(this.listChatMessages.bind(this)));
    app.put(`/rest/v1${this.toPath('/chatThreads/${encodeURIComponent(String(chatThreadId))}/messages/${encodeURIComponent(String(messageId))}')}`, [ keycloak.protect() ], this.catchAsync(this.updateChatMessage.bind(this)));
  }


  /**
   * Creates new chat message
   * @summary Creates new chat message
   * Accepted parameters:
    * - (body) ChatMessage body - Payload
    * - (path) number chatThreadId - Chat thread
  */
  public abstract createChatMessage(req: Request, res: Response): Promise<void>;


  /**
   * Deletes chat message
   * @summary Deletes chat message
   * Accepted parameters:
    * - (path) number chatThreadId - Chat thread
    * - (path) number messageId - Chat message id
  */
  public abstract deleteChatMessage(req: Request, res: Response): Promise<void>;


  /**
   * Returns chat thread
   * @summary Returns chat message
   * Accepted parameters:
    * - (path) number chatThreadId - Chat thread
    * - (path) number messageId - Chat message id
  */
  public abstract findChatMessage(req: Request, res: Response): Promise<void>;


  /**
   * Returns whether message has been read
   * @summary Returns whether message has been read
   * Accepted parameters:
    * - (path) number chatThreadId - Chat thread
    * - (path) number messageId - Chat message id
  */
  public abstract getMessageRead(req: Request, res: Response): Promise<void>;


  /**
   * Returns amount of users who have read message
   * @summary Returns amount of users who have read message
   * Accepted parameters:
    * - (path) number chatThreadId - Chat thread
    * - (path) number messageId - Chat message id
  */
  public abstract getMessageReadAmount(req: Request, res: Response): Promise<void>;


  /**
   * Returns list of chat messages
   * @summary Returns list of chat messages
   * Accepted parameters:
    * - (path) number chatThreadId - Chat thread
    * - (query) string createdBefore - Messages created before given time
    * - (query) string createdAfter - Messages created after given time
    * - (query) string userId - Messages created by given user
    * - (query) number firstResult - Offset of first result. Defaults to 0
    * - (query) number maxResults - Max results. Defaults to 5
  */
  public abstract listChatMessages(req: Request, res: Response): Promise<void>;


  /**
   * Update chat message
   * @summary Update chat message
   * Accepted parameters:
    * - (path) number chatThreadId - Chat thread
    * - (path) number messageId - Chat message id
  */
  public abstract updateChatMessage(req: Request, res: Response): Promise<void>;

}