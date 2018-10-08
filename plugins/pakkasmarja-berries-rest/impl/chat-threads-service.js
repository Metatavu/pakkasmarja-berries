/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';

  const _ = require("lodash");
  const i18n = require("i18n");
  const slugify = require("slugify");
  const AbstractChatThreadsService = require(`${__dirname}/../service/chat-threads-service`);
  const ApplicationRoles = require(`${__dirname}/../application-roles`);

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
    * Returns chat thread report
    * Returns chat thread report
    *
    * @param {http.ClientRequest} req client request object
    * @param {http.ServerResponse} res server response object
    **/
    async getChatThreadReport(req, res) {
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
      const messages = await this.models.listMessagesByThreadId(thread.id);
      const userAnswers = {};

      for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        const answer = message.contents ? _.trim(message.contents) : null;
        if (answer) {
          userAnswers[message.userId] = answer;
        }
      }
      
      const summary = {};
      const values = Object.values(userAnswers);

      for (let i = 0; i < values.length; i++) {
        const value = values[i];
        summary[value] = (summary[value] || 0) + 1;  
      }

      const columnHeaders = [
        i18n.__("chatThreadSummaryReport.answer"),
        i18n.__("chatThreadSummaryReport.count")
      ];

      const keys = Object.keys(summary);
      keys.sort((a, b) => {
        return parseInt(a) - parseInt(b);
      });

      const rows = [];
      for (let i = 0; i < keys.length; i++) {
        rows.push([keys[i], summary[keys[i]]]);
      }

      const name = "summary-report";
      const filename =`${slugify(name)}.xlsx`;

      res.setHeader("Content-disposition", `attachment; filename=${filename}`);
      res.status(200).send(this.xlsx.buildXLSX(name, columnHeaders, rows));
    }

  };

  module.exports = ChatThreadsServiceImpl;

})();

