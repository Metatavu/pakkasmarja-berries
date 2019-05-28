import * as _ from "lodash";
import slugify from "slugify";
import ChatThreadsService from "../api/chatThreads.service";
import { Request, Response } from "express";
import ApplicationRoles from "../application-roles";
import models, { ThreadModel, ThreadPredefinedTextModel, ChatGroupModel } from "../../models";
import excel from "../../excel";
import { ChatThread, ChatGroupType, ChatThreadGroupPermission, ChatThreadPermissionScope, ChatThreadUserPermission } from "../model/models";
import { CHAT_GROUP_ACCESS, CHAT_GROUP_MANAGE, ApplicationScope, CHAT_GROUP_TRAVERSE } from "../application-scopes";
import { Promise } from "bluebird";
import mqtt from "../../mqtt";
import userManagement from "../../user-management";
import chatThreadPermissionController from "../../user-management/chat-thread-permission-controller";
import * as i18n from "i18n";

/**
 * Threads REST service
 */
export default class ChatThreadsServiceImpl extends ChatThreadsService {

  /**
   * @inheritdoc
   */
  public async createChatThreadGroupPermissions(req: Request, res: Response): Promise<void> {
    const chatThreadId = parseInt(req.params.chatThreadId);

    const chatThread = await models.findThread(chatThreadId);
    if (!chatThread) {
      this.sendNotFound(res);
      return;
    }

    const chatGroup = await models.findChatGroup(chatThread.groupId);
    if (!chatGroup) {
      this.sendBadRequest(res, "Invalid chat group id");
      return;
    }

    if (!(await this.isThreadManagePermission(req, chatThread, chatGroup))) {
      this.sendForbidden(res);
      return;
    }

    const body: ChatThreadGroupPermission = req.body;

    const userGroupId = body.userGroupId;
    if (!userGroupId) {
      this.sendInternalServerError(res, "Missing userGroupId");
      return;
    }

    const userGroup = await userManagement.findGroup(userGroupId);
    if (!userGroup || !userGroup.id) {
      this.sendInternalServerError(res, "Could not find user group");
      return;
    }

    const scope = this.translatePermissionScope(body.scope);
    if (!scope) {
      this.sendBadRequest(res, `Invalid scope ${body.scope}`);
      return;
    }

    await chatThreadPermissionController.setUserGroupChatThreadScope(chatThread, userGroup, scope);

    const result: ChatThreadGroupPermission = {
      chatThreadId: chatThread.id,
      userGroupId: userGroup.id,
      id: chatThreadPermissionController.getChatThreadGroupPermissionId(chatThread, userGroup.id),
      scope: body.scope
    };

    res.status(200).send(result);
  }

  /**
   * @inheritdoc
   */
  public async findChatThreadGroupPermission(req: Request, res: Response): Promise<void> {
    const chatThreadId = parseInt(req.params.chatThreadId);

    const chatThread = await models.findThread(chatThreadId);
    if (!chatThread) {
      this.sendNotFound(res);
      return;
    }

    const chatGroup = await models.findChatGroup(chatThread.groupId);
    if (!chatGroup) {
      this.sendBadRequest(res, "Invalid chat group id");
      return;
    }

    if (!(await this.isThreadManagePermission(req, chatThread, chatGroup))) {
      this.sendForbidden(res);
      return;
    }
    
    const chatThreadPermissionId = req.params.permissionId;
    const userGroupId = chatThreadPermissionController.getThreadPermissionIdUserGroupId(chatThreadPermissionId);
    if (!userGroupId) {
      this.sendInternalServerError(res, "Failed to extract userGroupId");
      return;
    }

    const userGroup = await userManagement.findGroup(userGroupId);
    if (!userGroup || !userGroup.id) {
      this.sendInternalServerError(res, "Could not find user group");
      return;
    }

    const scope = this.translateApplicationScope(await chatThreadPermissionController.getUserGroupChatThreadScope(chatThread, userGroup));
    if (!scope) {
      this.sendNotFound(res);
      return;      
    }

    const result: ChatThreadGroupPermission = {
      chatThreadId: chatThread.id,
      userGroupId: userGroup.id,
      id: chatThreadPermissionController.getChatThreadGroupPermissionId(chatThread, userGroup.id),
      scope: scope
    };

    res.status(200).send(result);
  }

  /**
   * @inheritdoc
   */
  public async listChatThreadGroupPermissions(req: Request, res: Response): Promise<void> {
    const chatThreadId = parseInt(req.params.chatThreadId);

    const chatThread = await models.findThread(chatThreadId);
    if (!chatThread) {
      this.sendNotFound(res);
      return;
    }

    const chatGroup = await models.findChatGroup(chatThread.groupId);
    if (!chatGroup) {
      this.sendBadRequest(res, "Invalid chat group id");
      return;
    }

    if (!(await this.isThreadManagePermission(req, chatThread, chatGroup))) {
      this.sendForbidden(res);
      return;
    }

    const userGroups = await userManagement.listGroups(0, 999);
    
    const result = (await Promise.all(userGroups.map(async (userGroup) => {      
      const scope = this.translateApplicationScope(await chatThreadPermissionController.getUserGroupChatThreadScope(chatThread, userGroup));
      if (!scope) {
        return null;
      }

      const result: ChatThreadGroupPermission = {
        chatThreadId: chatThread.id,
        userGroupId: userGroup.id!,
        id: chatThreadPermissionController.getChatThreadGroupPermissionId(chatThread, userGroup.id!),
        scope: scope
      };
  
      return result;
    })))
    .filter((permission) => {
      return permission;
    });
    
    res.status(200).send(result);
  }

  /**
   * @inheritdoc
   */
  public async updateChatThreadGroupPermission(req: Request, res: Response): Promise<void> {
    const chatThreadId = parseInt(req.params.chatThreadId);

    const chatThread = await models.findThread(chatThreadId);
    if (!chatThread) {
      this.sendNotFound(res);
      return;
    }

    const chatGroup = await models.findChatGroup(chatThread.groupId);
    if (!chatGroup) {
      this.sendBadRequest(res, "Invalid chat group id");
      return;
    }

    if (!(await this.isThreadManagePermission(req, chatThread, chatGroup))) {
      this.sendForbidden(res);
      return;
    }

    const body: ChatThreadGroupPermission = req.body;
    const chatThreadPermissionId = req.params.permissionId;

    const userGroupId = chatThreadPermissionController.getThreadPermissionIdUserGroupId(chatThreadPermissionId);
    if (!userGroupId) {
      this.sendInternalServerError(res, "Failed to extract userGroupId");
      return;
    }

    const userGroup = await userManagement.findGroup(userGroupId);
    if (!userGroup || !userGroup.id) {
      this.sendInternalServerError(res, "Could not find user group");
      return;
    }
    
    const scope = this.translatePermissionScope(body.scope);
    if (!scope) {
      this.sendBadRequest(res, `Invalid scope ${body.scope}`);
      return;
    }

    await chatThreadPermissionController.setUserGroupChatThreadScope(chatThread, userGroup, scope);

    const result: ChatThreadGroupPermission = {
      chatThreadId: chatThread.id,
      userGroupId: userGroup.id,
      id: chatThreadPermissionController.getChatThreadGroupPermissionId(chatThread, userGroup.id),
      scope: body.scope
    };

    res.status(200).send(result);
  }

  /**
   * @inheritdoc
   */
  public async createChatThreadUserPermission(req: Request, res: Response): Promise<void> {
    const chatThreadId = parseInt(req.params.chatThreadId);

    const chatThread = await models.findThread(chatThreadId);
    if (!chatThread) {
      this.sendNotFound(res);
      return;
    }

    const chatGroup = await models.findChatGroup(chatThread.groupId);
    if (!chatGroup) {
      this.sendBadRequest(res, "Invalid chat group id");
      return;
    }

    if (!(await this.isThreadManagePermission(req, chatThread, chatGroup))) {
      this.sendForbidden(res);
      return;
    }

    const body: ChatThreadUserPermission = req.body;
    const userId = body.userId;
    if (!userId) {
      this.sendInternalServerError(res, "Missing userId");
      return;
    }

    const user = await userManagement.findUser(userId);
    if (!user || !user.id) {
      this.sendInternalServerError(res, "Could not find user");
      return;
    }

    const scope = this.translatePermissionScope(body.scope);
    if (!scope) {
      this.sendBadRequest(res, `Invalid scope ${body.scope}`);
      return;
    }

    await chatThreadPermissionController.setUserChatThreadScope(chatThread, user, scope);

    const result: ChatThreadUserPermission = {
      chatThreadId: chatThread.id,
      userId: user.id,
      id: chatThreadPermissionController.getChatThreadUserPermissionId(chatThread, user.id),
      scope: body.scope
    };

    res.status(200).send(result);
  }

  /**
   * @inheritdoc
   */
  public async findChatThreadUserPermission(req: Request, res: Response): Promise<void> {
    const chatThreadId = parseInt(req.params.chatThreadId);

    const chatThread = await models.findThread(chatThreadId);
    if (!chatThread) {
      this.sendNotFound(res);
      return;
    }

    const chatGroup = await models.findChatGroup(chatThread.groupId);
    if (!chatGroup) {
      this.sendBadRequest(res, "Invalid chat group id");
      return;
    }

    if (!(await this.isThreadManagePermission(req, chatThread, chatGroup))) {
      this.sendForbidden(res);
      return;
    }
    
    const chatThreadPermissionId = req.params.permissionId;
    const userId = chatThreadPermissionController.getThreadPermissionIdUserId(chatThreadPermissionId);
    if (!userId) {
      this.sendInternalServerError(res, "Failed to extract userId");
      return;
    }

    const user = await userManagement.findUser(userId);
    if (!user || !user.id) {
      this.sendInternalServerError(res, "Could not find user");
      return;
    }

    const scope = this.translateApplicationScope(await chatThreadPermissionController.getUserChatThreadScope(chatThread, user));
    if (!scope) {
      this.sendNotFound(res);
      return;      
    }

    const result: ChatThreadUserPermission = {
      chatThreadId: chatThread.id,
      userId: user.id,
      id: chatThreadPermissionController.getChatThreadUserPermissionId(chatThread, user.id),
      scope: scope
    };

    res.status(200).send(result);
  }

  /**
   * @inheritdoc
   */
  public async listChatThreadUserPermissions(req: Request, res: Response): Promise<void> {
    const chatThreadId = parseInt(req.params.chatThreadId);

    const chatThread = await models.findThread(chatThreadId);
    if (!chatThread) {
      this.sendNotFound(res);
      return;
    }

    const chatGroup = await models.findChatGroup(chatThread.groupId);
    if (!chatGroup) {
      this.sendBadRequest(res, "Invalid chat group id");
      return;
    }

    if (!(await this.isThreadManagePermission(req, chatThread, chatGroup))) {
      this.sendForbidden(res);
      return;
    }

    // TODO: Max 999?
    const users = await userManagement.listUsers({
      max: 999
    });
    
    const result = (await Promise.all(users.map(async (user) => {      
      const scope = this.translateApplicationScope(await chatThreadPermissionController.getUserChatThreadScope(chatThread, user));
      if (!scope) {
        return null;
      }

      const result: ChatThreadUserPermission = {
        chatThreadId: chatThread.id,
        userId: user.id!,
        id: chatThreadPermissionController.getChatThreadUserPermissionId(chatThread, user.id!),
        scope: scope
      };
  
      return result;
    })))
    .filter((permission) => {
      return permission;
    });
    
    res.status(200).send(result);
  }

  /**
   * @inheritdoc
   */
  public async updateChatThreadUserPermission(req: Request, res: Response): Promise<void> {
    const chatThreadId = parseInt(req.params.chatThreadId);

    const chatThread = await models.findThread(chatThreadId);
    if (!chatThread) {
      this.sendNotFound(res);
      return;
    }

    const chatGroup = await models.findChatGroup(chatThread.groupId);
    if (!chatGroup) {
      this.sendBadRequest(res, "Invalid chat group id");
      return;
    }

    if (!(await this.isThreadManagePermission(req, chatThread, chatGroup))) {
      this.sendForbidden(res);
      return;
    }

    const body: ChatThreadUserPermission = req.body;
    const chatThreadPermissionId = req.params.permissionId;

    const userId = chatThreadPermissionController.getThreadPermissionIdUserId(chatThreadPermissionId);
    if (!userId) {
      this.sendInternalServerError(res, "Failed to extract userId");
      return;
    }

    const user = await userManagement.findUser(userId);
    if (!user || !user.id) {
      this.sendInternalServerError(res, "Could not find user");
      return;
    }
    
    const scope = this.translatePermissionScope(body.scope);
    if (!scope) {
      this.sendBadRequest(res, `Invalid scope ${body.scope}`);
      return;
    }

    await chatThreadPermissionController.setUserChatThreadScope(chatThread, user, scope);

    const result: ChatThreadUserPermission = {
      chatThreadId: chatThread.id,
      userId: user.id,
      id: chatThreadPermissionController.getChatThreadUserPermissionId(chatThread, user.id),
      scope: body.scope
    };

    res.status(200).send(result);
  }

  /**
   * @inheritdoc
   */
  public async createChatThread(req: Request, res: Response): Promise<void> {
    const payload: ChatThread = req.body;
    const chatGroupId = payload.groupId;
    const chatGroup = await models.findChatGroup(chatGroupId);
    if (!chatGroup) {
      this.sendBadRequest(res, `Invalid chat group id ${chatGroupId} specified when creating new thread`);
      return;
    }

    if (!(await this.hasResourcePermission(req, chatThreadPermissionController.getChatGroupResourceName(chatGroup), [CHAT_GROUP_MANAGE]))) {
      this.sendForbidden(res);
      return;
    }

    const allowOther = payload.pollAllowOther === undefined || payload.pollAllowOther === null ? true : payload.pollAllowOther;

    const ownerId = this.getLoggedUserId(req);
    const thread = await models.createThread(
      chatGroup.id,
      ownerId,
      payload.title,
      payload.description,
      chatGroup.type,
      payload.imageUrl,
      payload.answerType,
      allowOther,
      payload.expiresAt);

    const resource = await chatThreadPermissionController.createChatThreadResource(thread);    
    await chatThreadPermissionController.createChatThreadPermission(thread, resource, "chat-thread:access", []);
    const createPollPredefinedTextPromises = (payload.pollPredefinedTexts || []).map((predefinedText) => {
      return models.createThreadPredefinedText(thread.id, predefinedText);
    });
    await Promise.all(createPollPredefinedTextPromises);

    res.status(200).send(await this.translateChatThread(thread, chatGroup));

    mqtt.publish("chatthreads", {
      "operation": "CREATED",
      "id": thread.id
    });
  }

  /**
   * @inheritdoc
   */
  public async deleteChatThread(req: Request, res: Response): Promise<void> {
    const chatThreadId = parseInt(req.params.chatThreadId);
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

    if (!(await this.hasResourcePermission(req, chatThreadPermissionController.getChatGroupResourceName(chatGroup), [CHAT_GROUP_MANAGE]))) {
      this.sendForbidden(res);
      return;
    }

    models.deleteThread(thread.id);
    await chatThreadPermissionController.deletePermission(chatThreadPermissionController.getPermissionName(thread, "chat-thread:access"));

    res.status(204).send();

    mqtt.publish("chatthreads", {
      "operation": "DELETED",
      "id": chatThreadId
    });
  }

  /**
   * @inheritdoc
   */
  public async findChatThread(req: Request, res: Response): Promise<void> {
    const chatThreadId = req.params.chatThreadId;
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

    res.status(200).send(await this.translateChatThread(thread, chatGroup));
  }

  /**
   * @inheritdoc
   */
  public async listChatThreads(req: Request, res: Response): Promise<void> {
    const groupId = req.query.groupId;
    const groupType: ChatGroupType = req.query.groupType;
    const ownerId: string | undefined = req.query.ownerId;

    const allChatGroups = groupId ? [ models.findChatGroup(groupId) ] : models.listChatGroups(groupType);
    const chatGroups = await Promise.all(Promise.filter(allChatGroups, async (chatGroup) => {
      if (!chatGroup) {
        return false;
      }

      const result = await this.hasResourcePermission(req, chatThreadPermissionController.getChatGroupResourceName(chatGroup), [CHAT_GROUP_TRAVERSE, CHAT_GROUP_ACCESS, CHAT_GROUP_MANAGE]);

      return result;
    }));

    const chatGroupMap = _.keyBy(chatGroups, "id");
    const chatGroupIds = _.map(chatGroups, "id");

    const threads = await Promise.all(Promise.filter(await models.listThreads(chatGroupIds, ownerId), async (thread) => {
      return await this.isThreadAccessPermission(req, thread, chatGroupMap[thread.groupId]);
    }));

    res.status(200).send(await Promise.all(threads.map((thread) => {
      return this.translateChatThread(thread, chatGroupMap[thread.groupId]);
    })));
  }

  /**
   * @inheritdoc
   */
  public async updateChatThread(req: Request, res: Response): Promise<void> {
    const payload: ChatThread = req.body;

    const chatThreadId = req.params.chatThreadId;
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

    if (!(await this.isThreadManagePermission(req, thread, chatGroup))) {
      this.sendForbidden(res);
      return;
    }

    const allowOther = payload.pollAllowOther === undefined || payload.pollAllowOther === null ? true : payload.pollAllowOther;

    await models.updateThread(
      thread.id,
      thread.ownerId || null,
      payload.title,
      payload.description,
      payload.imageUrl,
      true,
      payload.answerType,
      allowOther,
      payload.expiresAt);

    const predefinedTextObjects = await models.listThreadPredefinedTextsByThreadId(thread.id);
    const existingPredefinedTexts = predefinedTextObjects.map((predefinedTextObject) => {
      return predefinedTextObject.text;
    });

    const payloadPredefinedTexts = payload.pollPredefinedTexts || [];
    for (let i = 0; i < payloadPredefinedTexts.length; i++) {
      const payloadPredefinedText = payloadPredefinedTexts[i];
      const existingIndex = existingPredefinedTexts.indexOf(payloadPredefinedText);

      if (existingIndex > -1) {
        existingPredefinedTexts.splice(existingIndex, 1);
      } else {
        await models.createThreadPredefinedText(thread.id, payloadPredefinedText);
      }
    }

    for (let i = 0; i < existingPredefinedTexts.length; i++) {
      const existingText = existingPredefinedTexts[i];
      await models.deleteThreadPredefinedTextByThreadIdAndText(thread.id, existingText);
    }

    res.status(200).send(await this.translateChatThread(await models.findThread(chatThreadId), chatGroup));

    mqtt.publish("chatthreads", {
      "operation": "UPDATED",
      "id": thread.id
    });
  }

  /**
   * @inheritdoc
   */
  public async getChatThreadReport(req: Request, res: Response) {
    if (!this.hasRealmRole(req, ApplicationRoles.MANAGE_THREADS)) {
      this.sendForbidden(res, "You have no permission to manage threads");
      return;
    }

    const threadId = req.params.threadId;
    const type = req.params.type;
    const thread = await models.findThread(threadId);
    if (!thread) {
      return this.sendNotFound(res, "Not found");
    }

    if (!type) {
      return this.sendBadRequest(res, "Type is required");
    }
    
    const expectedTypes = ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
    const accept = this.getBareContentType(req.header("accept")) || expectedTypes[0];

    if (expectedTypes.indexOf(accept) === -1) {
      this.sendBadRequest(res, `Unsupported accept ${accept}, should be one of ${expectedTypes.join(",")}`);
      return;
    }

    res.setHeader("Content-type", accept);

    switch (type) {
      case "summaryReport":
        return await this.sendChatThreadSummaryReportXLSX(req, res, thread);
      default:
        return this.sendBadRequest(res, `Invalid type ${type}`);
    }
  }

  /**
   * Returns thread summary report as xlsx
   * 
   * @param {http.ClientRequest} req client request object
   * @param {http.ServerResponse} res server response object
   * @param {Object} thread thread 
   */
  private async sendChatThreadSummaryReportXLSX(req: Request, res: Response, thread: ThreadModel) {
    const predefinedTexts = (await models.listThreadPredefinedTextsByThreadId(thread.id)).map((predefinedText: ThreadPredefinedTextModel) => {
      return predefinedText.text;
    });

    const messages = await models.listMessagesByThreadId(thread.id);
    messages.sort((a, b) => {
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    const predefinedTextCounts = {};

    const userAnswerMap: { [key: string]: string } = {};

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const answer = message.contents ? _.trim(message.contents) : null;
      if (answer) {
        userAnswerMap[message.userId] = answer;
      }
    }

    const userAnswers = Object.values(userAnswerMap);

    for (let i = 0; i < userAnswers.length; i++) {
      const userAnswer = userAnswers[i];
      predefinedTextCounts[userAnswer] = (predefinedTextCounts[userAnswer] || 0) + 1;  
    }

    const otherAnswers = _.without.apply(_, [userAnswers].concat(predefinedTexts));
          
    const columnHeaders = [
      i18n.__("chatThreadSummaryReport.answer"),
      i18n.__("chatThreadSummaryReport.count")
    ];

    const rows = [];
    for (let i = 0; i < predefinedTexts.length; i++) {
      const predefinedText = predefinedTexts[i];
      rows.push([predefinedText, predefinedTextCounts[predefinedText] || 0]);
    }

    if (otherAnswers.length > 0) {
      rows.push([]);
      rows.push(["Muut vastaukset"]);
      rows.push([]);
    }

    for (let i = 0; i < otherAnswers.length; i++) {
      rows.push([otherAnswers[i]]);
    }

    const name = "summary-report";
    const filename =`${slugify(name)}.xlsx`;

    res.setHeader("Content-disposition", `attachment; filename=${filename}`);
    res.status(200).send(excel.buildXLSX(name, columnHeaders, rows));
  }


  /**
   * Translates application scope into REST scope
   * 
   * @param scope scope to be translated
   * @returns translated scope
   */
  private translatePermissionScope(scope: ChatThreadPermissionScope | null): ApplicationScope | null {
    if (!scope) {
      return null;
    }

    switch (scope) {
      case "ACCESS":
        return "chat-thread:access";
    }

    return null;
  }

  /**
   * Translates application scope into REST scope
   * 
   * @param scope scope to be translated
   * @returns translated scope
   */
  private translateApplicationScope(scope: ApplicationScope | null): ChatThreadPermissionScope | null {
    if (!scope) {
      return null;
    }

    switch (scope) {
      case "chat-thread:access":
        return "ACCESS";
    }

    return null;
  }

  /**
   * Translates database chat thread into REST chat thread 
   * 
   * @param {Object} databaseChatThread database chat thread
   */
  private async translateChatThread(databaseChatThread: ThreadModel, databaseChatGroup: ChatGroupModel) {
    let answerType: ChatThread.AnswerTypeEnum;

    if (databaseChatThread.answerType == "POLL") {
      answerType = "POLL";
    } else {
      answerType = "TEXT";
    } 

    const title = databaseChatGroup.type == "QUESTION" && databaseChatThread.ownerId 
      ? userManagement.getUserDisplayName(await userManagement.findUser(databaseChatThread.ownerId)) 
      : databaseChatThread.title;

    const predefinedTextObjects = await models.listThreadPredefinedTextsByThreadId(databaseChatThread.id);
    const predefinedTexts = predefinedTextObjects.map((predefinedTextObject) => {
      return predefinedTextObject.text;
    });

    const result: ChatThread = {
      id: databaseChatThread.id,
      title: title || "",
      description: databaseChatThread.description,
      imageUrl: databaseChatThread.imageUrl,
      groupId: databaseChatThread.groupId,
      pollPredefinedTexts: predefinedTexts,
      answerType: answerType,
      expiresAt: databaseChatThread.expiresAt || null,
      pollAllowOther: databaseChatThread.pollAllowOther
    };

    return result;
  }


}
