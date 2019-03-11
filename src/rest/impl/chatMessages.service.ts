import * as _ from "lodash";
import ChatMessagesService from "../api/chatMessages.service";
import { Request, Response } from "express";
import models, { MessageModel } from "../../models";
import { ChatMessage } from "../model/models";
import { CHAT_GROUP_ACCESS, CHAT_GROUP_MANAGE } from "../application-scopes";
import mqtt from "../../mqtt";

/**
 * Messages REST service
 */
export default class ChatMessagesServiceImpl extends ChatMessagesService {

  /**
   * @inheritdoc
   */
  public async createChatMessage(req: Request, res: Response): Promise<void> {
    const chatThreadId = req.params.chatThreadId;
    const payload: ChatMessage = req.body;

    const thread = await models.findThread(chatThreadId);
    if (!thread) {
      this.sendNotFound(res);
      return;
    }

    const chatGroup = await models.findChatGroup(thread.groupId);
    if (!chatGroup) {
      this.sendInternalServerError(res);
      return;
    }

    if (!(await this.hasResourcePermission(req, this.getChatGroupResourceName(chatGroup), [CHAT_GROUP_ACCESS]))) {
      this.sendForbidden(res);
      return;
    }

    const message = await models.createMessage(thread.id, this.getLoggedUserId(req), payload.contents);
    res.status(200).send(this.translateChatMessage(message));

    mqtt.publish("chatmessages", {
      "operation": "CREATED",
      "id": message.id
    });
  }

  /**
   * @inheritdoc
   */
  public async deleteChatMessage(req: Request, res: Response): Promise<void> {
    const chatThreadId = req.params.chatThreadId;
    const messageId = req.params.messageId;

    const thread = await models.findThread(chatThreadId);
    if (!thread) {
      this.sendNotFound(res);
      return;
    }

    const chatGroup = await models.findChatGroup(thread.groupId);
    if (!chatGroup) {
      this.sendInternalServerError(res);
      return;
    }

    const chatMessage = await models.findMessage(messageId);
    if (!chatMessage || chatMessage.threadId != thread.id) {
      this.sendNotFound(res);
      return;
    }

    if (chatMessage.userId != this.getLoggedUserId(req)) {
      if (!(await this.hasResourcePermission(req, this.getChatGroupResourceName(chatGroup), [CHAT_GROUP_MANAGE]))) {
        this.sendForbidden(res);
        return;
      }
    }

    await models.deleteMessage(chatMessage.id);

    res.status(204).send();

    mqtt.publish("chatmessages", {
      "operation": "DELETED",
      "id": chatMessage.id
    });
  }

  /**
   * @inheritdoc
   */
  public async findChatMessage(req: Request, res: Response): Promise<void> {
    const chatThreadId = req.params.chatThreadId;
    const chatMessageId = req.params.messageId;
    const message = await models.findMessage(chatMessageId);
    if (!message) {
      this.sendNotFound(res);
      return;
    }

    if (message.threadId != chatThreadId) {
      this.sendNotFound(res);
      return;
    }
    
    const thread = await models.findThread(message.threadId);
    if (!thread) {
      this.sendInternalServerError(res);
      return;
    }

    const chatGroup = await models.findChatGroup(thread.groupId);
    if (!chatGroup) {
      this.sendInternalServerError(res);
      return;
    }

    if (message.userId != this.getLoggedUserId(req)) {
      if (!(await this.hasResourcePermission(req, this.getChatGroupResourceName(chatGroup), [CHAT_GROUP_ACCESS]))) {
        this.sendForbidden(res);
        return;
      }
    }

    res.status(200).send(this.translateChatMessage(message));
  }

  /**
   * @inheritdoc
   */
  public async listChatMessages(req: Request, res: Response): Promise<void> {
    const chatThreadId = req.params.chatThreadId;
    
    const thread = await models.findThread(chatThreadId);
    if (!thread) {
      this.sendBadRequest(res, "Invalid thread id");
      return;
    }

    const chatGroup = await models.findChatGroup(thread.groupId);
    if (!chatGroup) {
      this.sendInternalServerError(res);
      return;
    }

    if (!(await this.hasResourcePermission(req, this.getChatGroupResourceName(chatGroup), [CHAT_GROUP_ACCESS]))) {
      this.sendForbidden(res);
      return;
    }

    const messages = await models.listMessagesByThreadId(chatThreadId);

    res.status(200).send(messages.map((message) => {
      return this.translateChatMessage(message);
    }));
  }

  /**
   * @inheritdoc
   */
  public async updateChatMessage(req: Request, res: Response): Promise<void> {
    const chatThreadId = req.params.chatThreadId;
    const messageId = req.params.messageId;
    const payload: ChatMessage = req.body;

    const thread = await models.findThread(chatThreadId);
    if (!thread) {
      this.sendNotFound(res);
      return;
    }

    const chatGroup = await models.findChatGroup(thread.groupId);
    if (!chatGroup) {
      this.sendInternalServerError(res);
      return;
    }

    const chatMessage = await models.findMessage(messageId);
    if (!chatMessage || chatMessage.threadId != thread.id) {
      this.sendNotFound(res);
      return;
    }

    if (chatMessage.userId != this.getLoggedUserId(req)) {
      if (!(await this.hasResourcePermission(req, this.getChatGroupResourceName(chatGroup), [CHAT_GROUP_MANAGE]))) {
        this.sendForbidden(res);
        return;
      }
    }

    await models.updateMessage(chatMessage.id, payload.contents);
    res.status(200).send(this.translateChatMessage(await models.findMessage(messageId)));

    mqtt.publish("chatmessages", {
      "operation": "UPDATED",
      "id": chatMessage.id
    });
  }

  /**
   * Translates database chat message into REST chat message 
   * 
   * @param {Object} databaseChatMessage database chat message
   */
  private translateChatMessage(databaseChatMessage: MessageModel) {
    const result: ChatMessage = {
      id: databaseChatMessage.id,
      contents: databaseChatMessage.contents,
      createdAt: this.truncateTime(databaseChatMessage.createdAt),
      threadId: databaseChatMessage.threadId,
      updatedAt: this.truncateTime(databaseChatMessage.updatedAt),
      userId: databaseChatMessage.userId
    };

    return result;
  }


}
