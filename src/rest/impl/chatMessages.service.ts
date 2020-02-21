import * as _ from "lodash";
import * as moment from "moment";
import * as uuid from "uuid4";
import ChatMessagesService from "../api/chatMessages.service";
import { Request, Response } from "express";
import models, { MessageModel, ThreadModel, ChatGroupModel } from "../../models";
import { ChatMessage } from "../model/models";
import mqtt from "../../mqtt";
import chatThreadPermissionController from "../../user-management/chat-thread-permission-controller";
import userManagement from "../../user-management";
import chatGroupPermissionController from "../../user-management/chat-group-permission-controller";
import pushNotifications from "../../push-notifications";

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
    const loggedUserId = this.getLoggedUserId(req);

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

    if (!(await this.isThreadAccessPermission(req, thread, chatGroup))) {
      this.sendForbidden(res);
      return;
    }
    
    const message = await models.createMessage(thread.id, this.getLoggedUserId(req), payload.contents, payload.image);
    res.status(200).send(this.translateChatMessage(message));

    if (thread.answerType !== "POLL") {
      this.sendNotifications(loggedUserId, chatGroup, thread, message);
    }

    mqtt.publish("chatmessages", {
      "operation": "CREATED",
      "messageId": message.id,
      "threadId": thread.id,
      "groupId": chatGroup.id
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
      if (!(await this.isThreadManagePermission(req, thread, chatGroup))) {
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

    if (!(await this.isThreadAccessPermission(req, thread, chatGroup))) {
      this.sendForbidden(res);
      return;
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

    const createdBefore = req.query.createdBefore ? moment(req.query.createdBefore).toDate() : null;
    const createdAfter = req.query.createdAfter ? moment(req.query.createdAfter).toDate() : null;
    const userId = thread.answerType === "POLL" ? this.getLoggedUserId(req) : req.query.userId || null;
    const firstResult = parseInt(req.query.firstResult) || 0;
    const maxResults = parseInt(req.query.maxResults) || 5;

    if (!(await this.isThreadAccessPermission(req, thread, chatGroup))) {
      this.sendForbidden(res);
      return;
    }

    const messages = await models.listMessages(chatThreadId, createdBefore, createdAfter, userId, firstResult, maxResults);
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
      if (!(await this.isThreadManagePermission(req, thread, chatGroup))) {
        this.sendForbidden(res);
        return;
      }
    }

    await models.updateMessage(chatMessage.id, payload.contents, payload.image);
    res.status(200).send(this.translateChatMessage(await models.findMessage(messageId)));

    mqtt.publish("chatmessages", {
      "operation": "UPDATED",
      "id": chatMessage.id
    });
  }

  /**
   * @inheritdoc
   */
  public async listMessageReadBy(req: Request, res: Response): Promise<void> {
    const chatThreadId = req.params.chatThreadId;
    const messageId = req.params.messageId;

    const chatThread = await models.findThread(chatThreadId);
    if (!chatThread) {
      this.sendNotFound(res);
      return;
    }

    const chatGroup = await models.findChatGroup(chatThread.groupId);
    if (!chatGroup) {
      this.sendInternalServerError(res);
      return;
    }

    const chatMessage = await models.findMessage(messageId);
    if (!chatMessage || chatMessage.threadId != chatThread.id) {
      this.sendNotFound(res);
      return;
    }

    if (chatMessage.userId != this.getLoggedUserId(req)) {
      if (!(await this.isThreadManagePermission(req, chatThread, chatGroup))) {
        this.sendForbidden(res);
        return;
      }
    }

    const permissionNames: string[] = [
      chatThreadPermissionController.getPermissionName(chatThread, "chat-thread:access"),
      chatGroupPermissionController.getPermissionName(chatGroup, "chat-group:access"),
      chatGroupPermissionController.getPermissionName(chatGroup, "chat-group:manage")
    ];

    const permissions = await userManagement.findPermissionsByNames(permissionNames);
    const permittedUsers = await userManagement.listPermissionsUsers(permissions);
    const path = `chat-${chatGroup.id}-${chatThread.id}-${chatMessage.id}`;

    const messageReadBy: string[] = [];

    permittedUsers.forEach(async user => {
      const userUnreads = await models.listUnreadsByPathLikeAndUserId(path, user.id!);
      if (userUnreads.length < 1) {
        messageReadBy.push(userManagement.getUserDisplayName(user) || "");
      }
    });

    res.status(200).send(messageReadBy);
  }

  /**
   * Translates database chat message into REST chat message 
   * 
   * @param {Object} databaseChatMessage database chat message
   */
  private translateChatMessage(databaseChatMessage: MessageModel) {
    const result: ChatMessage = {
      id: databaseChatMessage.id,
      contents: databaseChatMessage.contents || null,
      image: databaseChatMessage.image || null,
      createdAt: this.truncateTime(databaseChatMessage.createdAt),
      threadId: databaseChatMessage.threadId,
      updatedAt: this.truncateTime(databaseChatMessage.updatedAt),
      userId: databaseChatMessage.userId
    };

    return result;
  }

  /**
   * Sends notifications about created message to users with permissions to the message
   * 
   * @param message message
   */
  private async sendNotifications(loggedUserId: string, chatGroup: ChatGroupModel, chatThread: ThreadModel, message: MessageModel) {
    const permissionNames: string[] = [
      chatThreadPermissionController.getPermissionName(chatThread, "chat-thread:access"),
      chatGroupPermissionController.getPermissionName(chatGroup, "chat-group:access"),
      chatGroupPermissionController.getPermissionName(chatGroup, "chat-group:manage")
    ];

    const permissions = await userManagement.findPermissionsByNames(permissionNames);
    const permittedUsers = await userManagement.listPermissionsUsers(permissions);
    const path = `chat-${chatGroup.id}-${chatThread.id}-${message.id}`;
    const pushNotificationTitle = chatGroup.type == "QUESTION" ? "Uusi viesti kysymysryhmässä" : "Uusi viesti";
    const pushNotificationBody = chatGroup.type == "QUESTION" ? chatGroup.title : `Uusi viesti keskustelussa ${chatThread.title}`;
    const pushNotificationSetting = chatGroup.type == "QUESTION" ? 'question-push-notifications' : 'conversation-push-notifications';

    const unreadPromises = [];
    const pushPromises = [];

    for (let i = 0; i < permittedUsers.length; i++) {
      const permittedUser = permittedUsers[i];
      if (permittedUser.id != loggedUserId) {
        unreadPromises.push(models.createUnread(uuid(), path, permittedUser.id!));
        pushPromises.push(this.sendPushNotification(permittedUser.id!, pushNotificationTitle, pushNotificationBody, pushNotificationSetting));
      }
    }

    await Promise.all(unreadPromises);
    await Promise.all(pushPromises);
  }

  /**
   * Sends push notification to given user
   * 
   * @param userId user id
   * @param title title
   * @param body body
   * @param promise
   */
  private sendPushNotification = async (userId: string, title: string, body: string, settingKey: string) => {
    const userSetting = await models.findUserSettingsByUserIdAndKey(userId, settingKey);
    if (!userSetting) {
      pushNotifications.sendPushNotification(userId, title, body, true);
    } else {
      if (userSetting.settingValue !== 'disabled') {
        pushNotifications.sendPushNotification(userId, title, body, userSetting.settingValue !== 'silent');
      }
    }
  }

}