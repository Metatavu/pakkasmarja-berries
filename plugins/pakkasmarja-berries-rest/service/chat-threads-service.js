/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';

  const AbstractService = require(`${__dirname}/../abstract-service`);

  /**
   * Abstract base class for ChatThreads REST service
   */
  class AbstractChatThreadsService extends AbstractService {

   /**
    * Returns chat thread report
    * Returns chat thread report
    *
    * @param {http.ClientRequest} req client request object
    * @param {http.ServerResponse} res server response object
    **/
    getChatThreadReport(req, res) {
      res.status(501).send();
    }

   /**
    * Returns list of chat threads
    * Returns list of chat threads
    *
    * @param {http.ClientRequest} req client request object
    * @param {http.ServerResponse} res server response object
    **/
    listChatThreads(req, res) {
      res.status(501).send();
    }

   /**
    * Registers REST routes
    *
    * @param app express object
    **/
    register(app, keycloak) {
      app.get(`/rest/v1${this.toPath('/chatThreads/{threadId}/reports/{type}')}`, [ keycloak.protect() ], this.catchAsync(this.getChatThreadReport.bind(this)));
      app.get(`/rest/v1${this.toPath('/chatThreads')}`, [ keycloak.protect() ], this.catchAsync(this.listChatThreads.bind(this)));
    }
  };

  module.exports = AbstractChatThreadsService;

})();

