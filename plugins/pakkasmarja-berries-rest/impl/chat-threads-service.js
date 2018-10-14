/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';

  const _ = require("lodash");
  const i18n = require("i18n");
  const slugify = require("slugify");
  const AbstractChatThreadsService = require(`${__dirname}/../service/chat-threads-service`);
  const ApplicationRoles = require(`${__dirname}/../application-roles`);
  const ChatThread = require(`${__dirname}/../model/chat-thread`);

  /**
   * Threads REST service
   */
  class ChatThreadsServiceImpl extends AbstractChatThreadsService {

    /**
     * Constructor
     * 
     * @param {Object} logger logger
     * @param {Object} models models
     * @param {Object} xlsx Excel rendering functionalities
     */
    constructor(logger, models, xlsx) {
      super();
      this.logger = logger;
      this.models = models;
      this.xlsx = xlsx;
    }

    /**
    * Returns list of chat threads
    * Returns list of chat threads
    *
    * @param {http.ClientRequest} req client request object
    * @param {http.ServerResponse} res server response object
    **/
    async listChatThreads(req, res) {
      if (!this.hasRealmRole(req, ApplicationRoles.MANAGE_THREADS)) {
        this.sendForbidden(res, "You have no permission to manage threads");
        return;
      }

      const originId = req.query.originId;

      if (!originId) {
        return this.sendNotImplemented("Only origin id queries are currently supported");
      }

      const thread = await this.models.findThreadByOriginId(originId);
      const result = thread ? [ this.translateChatThread(thread) ] : [];

      res.send(result);
    }

   /**
    * Returns chat thread report
    * Returns chat thread report
    *
    * @param {http.ClientRequest} req client request object
    * @param {http.ServerResponse} res server response object
    **/
    async getChatThreadReport(req, res) {
      if (!this.hasRealmRole(req, ApplicationRoles.MANAGE_THREADS)) {
        this.sendForbidden(res, "You have no permission to manage threads");
        return;
      }

      const threadId = req.params.threadId;
      const type = req.params.type;
      const thread = await this.models.findThread(threadId);
      if (!thread) {
        return this.sendNotFound(res, "Not found");
      }

      if (!type) {
        return this.sendBadRequest(res, "Type is required");
      }
      
      const expectedTypes = ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
      const accept = this.getBareContentType(req.header("accept")) || expectedTypes[0];

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
    async sendChatThreadSummaryReportXLSX(req, res, thread) {
      const predefinedTexts = await this.models.listThreadPredefinedTextsByThreadId(thread.id).map((predefinedText) => {
        return predefinedText.text;
      });

      const messages = await this.models.listMessagesByThreadId(thread.id);
      const predefinedTextCounts = {};

      const userAnswers = {};

      for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        const answer = message.contents ? _.trim(message.contents) : null;
        if (answer) {
          userAnswers[message.userId] = answer;
        }
      }

      for (let i = 0; i < predefinedTexts.length; i++) {
        const predefinedText = predefinedTexts[i];
        predefinedTextCounts[predefinedText] = (predefinedTextCounts[predefinedText] || 0) + 1;  
      }

      const otherAnswers = _.without.apply(_, [Object.values(userAnswers)].concat(predefinedTexts));
            
      const columnHeaders = [
        i18n.__("chatThreadSummaryReport.answer"),
        i18n.__("chatThreadSummaryReport.count")
      ];

      const rows = [];
      for (let i = 0; i < predefinedTexts.length; i++) {
        const predefinedText = predefinedTexts[i];
        rows.push([predefinedText, predefinedTextCounts[predefinedText]]);
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
      res.status(200).send(this.xlsx.buildXLSX(name, columnHeaders, rows));
    }

    /**
     * Translates database chat thread into REST chat thread 
     * 
     * @param {Object} databaseChatThread database chat thread
     */
    translateChatThread(databaseChatThread) {
      return ChatThread.constructFromObject(databaseChatThread.dataValues);
    }


  };

  module.exports = ChatThreadsServiceImpl;

})();

