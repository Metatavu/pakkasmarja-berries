import * as _ from "lodash";
import slugify from "slugify";
import ChatThreadsService from "../api/chatThreads.service";
import { Request, Response } from "express";
import ApplicationRoles from "../application-roles";
import models, { ThreadModel, ThreadPredefinedTextModel, ChatGroupModel } from "../../models";
import excel from "../../excel";
import { ChatThread, ChatGroupType } from "../model/models";
import { CHAT_GROUP_ACCESS, CHAT_GROUP_MANAGE } from "../application-scopes";
import { Promise } from "bluebird";
import mqtt from "../../mqtt";
import userManagement from "../../user-management";

/**
 * Threads REST service
 */
export default class ChatThreadsServiceImpl extends ChatThreadsService {

  /**
   * @inheritdoc
   */
  public async createChatThread(req: Request, res: Response): Promise<void> {
    const payload: ChatThread = req.body;
    const chatGroupId = payload.groupId;
    const chatGroup = await models.findChatGroup(chatGroupId);
    if (!chatGroup) {
      this.sendBadRequest(res, "Invalid chat group id");
      return;
    }

    if (!(await this.hasResourcePermission(req, this.getChatGroupResourceName(chatGroup), [CHAT_GROUP_MANAGE]))) {
      this.sendForbidden(res);
      return;
    }

    const ownerId = this.getLoggedUserId(req);
    const thread = await models.createThread(chatGroup.id, ownerId, payload.title, payload.description, chatGroup.type, payload.imageUrl, payload.answerType, payload.pollAllowOther || true, payload.expiresAt);
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

    if (!(await this.hasResourcePermission(req, this.getChatGroupResourceName(chatGroup), [CHAT_GROUP_MANAGE]))) {
      this.sendForbidden(res);
      return;
    }

    models.deleteThread(thread.id);

    res.status(204).send();

    mqtt.publish("chatthreads", {
      "operation": "DELETED",
      "id": thread.id
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
    const allChatGroups = groupId ? [ models.findChatGroup(groupId) ] : models.listChatGroups(groupType);
    const chatGroups = await Promise.all(Promise.filter(allChatGroups, (chatGroup) => {
      if (!chatGroup) {
        return false;
      }

      return this.hasResourcePermission(req, this.getChatGroupResourceName(chatGroup), [CHAT_GROUP_ACCESS]);
    }));

    const chatGroupMap = _.keyBy(chatGroups, "id");
    const chatGroupIds = _.map(chatGroups, "id");

    const threads = await Promise.all(Promise.filter(await models.listThreads(chatGroupIds), async (thread) => {
      return this.isThreadAccessPermission(req, thread, chatGroupMap[thread.groupId]);
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

    await models.updateThread(thread.id, thread.ownerId, payload.title, payload.description, payload.imageUrl, true, payload.answerType, payload.pollAllowOther || true, payload.expiresAt);

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

    const result: ChatThread = {
      id: databaseChatThread.id,
      title: title,
      description: databaseChatThread.description,
      imageUrl: databaseChatThread.imageUrl,
      groupId: databaseChatThread.groupId,
      answerType: answerType,
      expiresAt: databaseChatThread.expiresAt || null,
      pollAllowOther: databaseChatThread.pollAllowOther
    };

    return result;
  }


}
