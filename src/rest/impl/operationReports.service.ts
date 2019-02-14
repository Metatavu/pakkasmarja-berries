import OperationReportsService from "../api/operationReports.service";
import * as Keycloak from "keycloak-connect";
import { Response, Request, Application } from "express";
import { OperationReport, OperationReportItem } from "../model/models";
import models, { OperationReportModel, OperationReportItemModel } from "../../models";
import ApplicationRoles from "../application-roles";

/**
 * Implementation for OperationReports REST service
 */
export default class OperationReportsServiceImpl extends OperationReportsService {
  
  /**
   * Constructor
   * 
   * @param app Express app
   * @param keycloak Keycloak
   */
  constructor(app: Application, keycloak: Keycloak) {
    super(app, keycloak);
  }

  /**
   * @inheritDoc
   **/
  async listOperationReports(req: Request, res: Response) {
    if (!this.hasRealmRole(req, ApplicationRoles.LIST_OPERATION_REPORTS)) {
      this.sendForbidden(res, "You do not have permission to list operation reports");
      return;
    }
    
    const type = req.query.type;
    const sortBy = req.query.sortBy;
    const orderDir = req.query.sortDir;
    const firstResult = parseInt(req.query.firstResult) || 0;
    const maxResults = parseInt(req.query.maxResults) || 20;

    if (sortBy && sortBy !== "CREATED") {
      this.sendBadRequest(res, `invalid sort by ${sortBy}`);
      return;
    }

    if (orderDir && ["ASC", "DESC"].indexOf(orderDir) === -1) {
      this.sendBadRequest(res, `invalid sort dir ${orderDir}`);
      return;
    }

    const orderBy = sortBy === "CREATED" ? "createdAt" : null;
    const reports = type ? await models.listOperationReportsByType(type, orderBy, orderDir, firstResult, maxResults) : await models.listOperationReports(orderBy, orderDir, firstResult, maxResults);
    const count = type ? await models.countOperationReportsByType(type) : await models.countOperationReports();
            
    const result = await Promise.all(reports.map((report: OperationReportModel) => {
      return this.translateDatabaseOperationReport(report);
    }));

    res.header("Total-Count", String(count));
    res.status(200).send(result);
  }

  /**
   * @inheritDoc
   **/
  async findOperationReport(req: Request, res: Response) {
    if (!this.hasRealmRole(req, ApplicationRoles.LIST_OPERATION_REPORTS)) {
      this.sendForbidden(res, "You do not have permission to view operation reports");
      return;
    }
    
    const operatioReportId = req.params.id;
    if (!operatioReportId) {
      this.sendNotFound(res);
      return;
    }

    const operationReport = await models.findOperationReportByExternalId(operatioReportId);
    if (!operationReport) {
      this.sendNotFound(res);
      return;
    }

    res.status(200).send(await this.translateDatabaseOperationReport(operationReport));
  }

  /**
   * @inheritDoc
   **/
  async listOperationReportItems(req: Request, res: Response) {
    if (!this.hasRealmRole(req, ApplicationRoles.LIST_OPERATION_REPORTS)) {
      this.sendForbidden(res, "You do not have permission to list operation reports");
      return;
    }
    
    const operatioReportId = req.params.id;
    if (!operatioReportId) {
      this.sendNotFound(res);
      return;
    }

    const operationReport = await models.findOperationReportByExternalId(operatioReportId);
    if (!operationReport) {
      this.sendNotFound(res);
      return;
    }

    const items = await models.listOperationReportItemsByOperationReportId(operationReport.id);
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
  async translateDatabaseOperationReport(operationReport: OperationReportModel) {
    const pendingCount = await models.countOperationReportItemsByOperationIdCompleted(operationReport.id, false);
    const failedCount = await models.countOperationReportItemsByOperationIdCompletedAndSuccess(operationReport.id, true, false);
    const successCount = await models.countOperationReportItemsByOperationIdCompletedAndSuccess(operationReport.id, true, true);
    const result: OperationReport = {
      "id": operationReport.externalId,
      "started": operationReport.createdAt,
      "type": operationReport.type,
      "pendingCount": pendingCount,
      "failedCount": failedCount,
      "successCount": successCount
    };

    return result;
  }

  /**
   * Translates Database operation report item into REST entity
   * 
   * @param {Object} operationReportItem Sequelize operation report item model
   * @return {OperationReportItem} REST entity
   */
  private translateDatabaseOperationReportItem(operationReportItem: OperationReportItemModel) {
    const status = operationReportItem.completed ? operationReportItem.success ? "SUCCESS" : "FAILURE" : "PENDING";
    const message = operationReportItem.message ? operationReportItem.message.toString() : null;

    const result: OperationReportItem = {
      "message": message,
      "status": status
    };
    
    return result;
  }
}