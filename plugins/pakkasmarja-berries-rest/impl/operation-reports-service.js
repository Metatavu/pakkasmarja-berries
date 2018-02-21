/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';

  const AbstractOperationReportsService = require(`${__dirname}/../service/operation-reports-service`);
  const OperationReport = require(`${__dirname}/../model/operation-report`);
  const OperationReportItem = require(`${__dirname}/../model/operation-report-item`);

  /**
   * Implementation for OperationReports REST service
   */
  class OperationReportsServiceImpl extends AbstractOperationReportsService {
    
    /**
     * Constructor for OperationReportsService service
     * 
     * @param {Object} logger logger
     * @param {Object} models models
     */
    constructor (logger, models) {
      super();
      
      this.logger = logger;
      this.models = models;
    }

    /**
     * @inheritDoc
     **/
    async listOperationReports(req, res) {
      const type = req.query.type;
      const sortBy = req.query.sortBy;
      const orderDir = req.query.sortDir;
      const firstResult = parseInt(req.query.firstResult) || 0;
      const maxResults = parseInt(req.query.maxResults) || 20;

      if (sortBy && sortBy !== 'CREATED') {
        this.sendBadRequest(res, `invalid sort by ${sortBy}`);
        return;
      }

      if (orderDir && ['ASC', 'DESC'].indexOf(orderDir) === -1) {
        this.sendBadRequest(res, `invalid sort dir ${orderDir}`);
        return;
      }

      const orderBy = sortBy === 'CREATED' ? 'createdAt' : null;
      const reports = type ? await this.models.listOperationReportsByType(type, orderBy, orderDir, firstResult, maxResults) : await this.models.listOperationReports(orderBy, orderDir, firstResult, maxResults);
      const result = await Promise.all(reports.map((report) => {
        return this.translateDatabaseOperationReport(report);
      }));

      res.status(200).send(result);
    }

    /**
     * @inheritDoc
     **/
    async findOperationReport(req, res) {
      const operatioReportId = req.params.id;
      if (!operatioReportId) {
        this.sendNotFound(res);
        return;
      }

      const operationReport = await this.models.findOperationReportByExternalId(operatioReportId);
      if (!operationReport) {
        this.sendNotFound(res);
        return;
      }

      res.status(200).send(await this.translateDatabaseOperationReport(operationReport));
    }

    /**
     * @inheritDoc
     **/
    async listOperationReportItems(req, res) {
      const operatioReportId = req.params.id;
      if (!operatioReportId) {
        this.sendNotFound(res);
        return;
      }

      const operationReport = await this.models.findOperationReportByExternalId(operatioReportId);
      if (!operationReport) {
        this.sendNotFound(res);
        return;
      }

      const items = await this.models.listOperationReportItemsByOperationReportId(operationReport.id);
      const result = items.map((item) => {
        return this.translateDatabaseOperationReportItem(item);
      });

      res.status(200).send(result);
    }

    /**
     * Translates Database operation report into REST entity
     * 
     * @param {Object} operationReport Sequelize operation report model
     * @return {Promise} Promise for REST entity
     */
    async translateDatabaseOperationReport(operationReport) {
      const pendingCount = await this.models.countOperationReportItemsByOperationIdCompleted(operationReport.id, false);
      const failedCount = await this.models.countOperationReportItemsByOperationIdCompletedAndSuccess(operationReport.id, true, false);
      const successCount = await this.models.countOperationReportItemsByOperationIdCompletedAndSuccess(operationReport.id, true, true);

      return OperationReport.constructFromObject({
        'id': operationReport.externalId,
        'started': operationReport.createdAt,
        'type': operationReport.type,
        'pendingCount': pendingCount,
        'failedCount': failedCount,
        'successCount': successCount
      });
    }

    /**
     * Translates Database operation report item into REST entity
     * 
     * @param {Object} operationReportItem Sequelize operation report item model
     * @return {OperationReportItem} REST entity
     */
    translateDatabaseOperationReportItem(operationReportItem) {
      const status = operationReportItem.completed ? operationReportItem.success ? 'SUCCESS' : 'FAILURE' : 'PENDING';
      return OperationReportItem.constructFromObject({
        'message': operationReportItem.message,
        'status': status
      });
    }
  }

  module.exports = OperationReportsServiceImpl;

})();

