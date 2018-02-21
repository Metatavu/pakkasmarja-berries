/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';

  const AbstractService = require(`${__dirname}/../abstract-service`);

  /**
   * Abstract base class for OperationReports REST service
   */
  class AbstractOperationReportsService extends AbstractService {

   /**
    * Find operation report
    * Find operation report by id
    *
    * @param {http.ClientRequest} req client request object
    * @param {http.ServerResponse} res server response object
    **/
    findOperationReport(req, res) {
      res.status(501).send();
    }

   /**
    * List operation report items
    * Lists operation report items
    *
    * @param {http.ClientRequest} req client request object
    * @param {http.ServerResponse} res server response object
    **/
    listOperationReportItems(req, res) {
      res.status(501).send();
    }

   /**
    * List operation reports
    * Lists operation reports
    *
    * @param {http.ClientRequest} req client request object
    * @param {http.ServerResponse} res server response object
    **/
    listOperationReports(req, res) {
      res.status(501).send();
    }

   /**
    * Registers REST routes
    *
    * @param app express object
    **/
    register(app, keycloak) {
      app.get(`/rest/v1${this.toPath('/operationReports/{id}')}`, [ keycloak.protect() ], this.catchAsync(this.findOperationReport.bind(this)));
      app.get(`/rest/v1${this.toPath('/operationReports/{id}/items')}`, [ keycloak.protect() ], this.catchAsync(this.listOperationReportItems.bind(this)));
      app.get(`/rest/v1${this.toPath('/operationReports')}`, [ keycloak.protect() ], this.catchAsync(this.listOperationReports.bind(this)));
    }
  };

  module.exports = AbstractOperationReportsService;

})();

