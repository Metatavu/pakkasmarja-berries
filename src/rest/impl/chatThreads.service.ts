import * as _ from "lodash";
import slugify from "slugify";
import ChatThreadsService from "../api/chatThreads.service";
import { Request, Response } from "express";
import ApplicationRoles from "../application-roles";
import models, { ThreadModel, ThreadPredefinedTextModel } from "../../models";
import excel from "../../excel";
import { ChatThread, ChatGroupType } from "../model/models";

  /**
   * Threads REST service
   */
export default class ChatThreadsServiceImpl extends ChatThreadsService {


  /**
   * Creates new chat thread
   * @summary Creates new chat thread
   * Accepted parameters:
    * - (body) ChatThread body - Payload
  */
  public async createChatThread(req: Request, res: Response): Promise<void> {

  }


 /**
  * Deletes chat thread
  * @summary Deletes chat thread
  * Accepted parameters:
   * - (path) number chatThreadId - Chat thread id
 */
  public async deleteChatThread(req: Request, res: Response): Promise<void> {
    
  }


 /**
  * Returns chat thread
  * @summary Returns chat thread
  * Accepted parameters:
   * - (path) number chatThreadId - Chat thread id
 */
  public async findChatThread(req: Request, res: Response): Promise<void> {
    // TODO: Secure
    
    const chatThreadId = req.params.chatThreadId;
    const thread = await models.findThread(chatThreadId);
    if (!thread) {
      this.sendNotFound(res);
      return;
    }
    
    res.status(200).send(this.translateChatThread(thread));
  }

 /**
  * Returns list of chat threads
  * @summary Returns list of chat threads
  * Accepted parameters:
   * - (query) number groupId - Filter chat threads by group id
   * - (query) ChatGroupType groupType - Filter chat groups by group type
 */
  public async listChatThreads(req: Request, res: Response): Promise<void> {
    // TODO: Secure

    const groupId = req.query.groupId;
    const groupType: ChatGroupType = req.query.groupType;

    const threads = await models.listThreads(groupId, groupType);

    res.status(200).send(threads.map((thread) => {
      return this.translateChatThread(thread);
    }));
  }


 /**
  * Update chat thread
  * @summary Update chat thread
  * Accepted parameters:
   * - (path) number chatThreadId - Chat thread id
 */
  public async updateChatThread(req: Request, res: Response): Promise<void> {
    
  }

  /**
   * Returns chat thread report
   * Returns chat thread report
   *
   * @param {http.ClientRequest} req client request object
   * @param {http.ServerResponse} res server response object
   **/
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
  async sendChatThreadSummaryReportXLSX(req: Request, res: Response, thread: ThreadModel) {
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
  translateChatThread(databaseChatThread: ThreadModel) {
    let answerType: ChatThread.AnswerTypeEnum;

    if (databaseChatThread.answerType == "POLL") {
      answerType = "POLL";
    } else {
      answerType = "TEXT";
    } 

    const result: ChatThread = {
      id: databaseChatThread.id,
      title: databaseChatThread.title,
      imageUrl: databaseChatThread.imageUrl,
      groupId: databaseChatThread.groupId,
      answerType: answerType
    };

    return result;
  }


}
