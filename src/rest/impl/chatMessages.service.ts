import * as _ from "lodash";
import ChatMessagesService from "../api/chatMessages.service";
import { Request, Response } from "express";
import models, { MessageModel } from "../../models";
import { ChatMessage } from "../model/models";

  /**
   * Messages REST service
   */
export default class ChatMessagesServiceImpl extends ChatMessagesService {

/**
   * Creates new chat message
   * @summary Creates new chat message
   * Accepted parameters:
    * - (body) ChatMessage body - Payload
    * - (path) number chatThreadId - Chat thread
  */
  public async createChatMessage(req: Request, res: Response): Promise<void> {
  }


 /**
  * Deletes chat message
  * @summary Deletes chat message
  * Accepted parameters:
   * - (path) number chatThreadId - Chat thread
   * - (path) number messageId - Chat message id
 */
  public async deleteChatMessage(req: Request, res: Response): Promise<void> {
  }


 /**
  * Returns chat thread
  * @summary Returns chat message
  * Accepted parameters:
   * - (path) number chatThreadId - Chat thread
   * - (path) number messageId - Chat message id
 */
  public async findChatMessage(req: Request, res: Response): Promise<void> {
    // TODO: Secure
    
    const chatMessageId = req.params.chatMessageId;
    const message = await models.findMessage(chatMessageId);
    if (!message) {
      this.sendNotFound(res);
      return;
    }
    
    res.status(200).send(this.translateChatMessage(message));
  }


 /**
  * Returns list of chat messages
  * @summary Returns list of chat messages
  * Accepted parameters:
   * - (path) number chatThreadId - Chat thread
 */
  public async listChatMessages(req: Request, res: Response): Promise<void> {
    // TODO: Secure

    const chatThreadId = req.params.chatThreadId;

    const messages = await models.listMessagesByThreadId(chatThreadId);

    res.status(200).send(messages.map((message) => {
      return this.translateChatMessage(message);
    }));
  }


 /**
  * Update chat message
  * @summary Update chat message
  * Accepted parameters:
   * - (path) number chatThreadId - Chat thread
   * - (path) number messageId - Chat message id
 */
  public async updateChatMessage(req: Request, res: Response): Promise<void> {
  }

  /**
   * Translates database chat message into REST chat message 
   * 
   * @param {Object} databaseChatMessage database chat message
   */
  translateChatMessage(databaseChatMessage: MessageModel) {
    const result: ChatMessage = {
      id: databaseChatMessage.id,
      contents: databaseChatMessage.contents,
      createdAt: databaseChatMessage.createdAt,
      threadId: databaseChatMessage.threadId,
      updatedAt: databaseChatMessage.updatedAt,
      userId: databaseChatMessage.userId
    };

    return result;
  }


}
