import * as _ from "lodash";
import { Keycloak } from "keycloak-connect";
import { Response, Request, Application } from "express";
import { getLogger, Logger } from "log4js";
import { Operation } from "../model/models";
import models from "../../models";
import ApplicationRoles from "../application-roles";
import OperationsService from "../api/operations.service";
import tasks from "../../tasks";
import { config } from "../../config";

const OPERATION_SAP_CONTACT_SYNC = "SAP_CONTACT_SYNC";
const OPERATION_ITEM_GROUP_DEFAULT_DOCUMENT_TEMPLATES = "ITEM_GROUP_DEFAULT_DOCUMENT_TEMPLATES";

/**
 * Implementation for Operation REST service
 */
export default class OperationsServiceImpl extends OperationsService {

  private logger: Logger;

  /**
   * Constructor
   *
   * @param app Express app
   * @param keycloak Keycloak
   */
  constructor(app: Application, keycloak: Keycloak) {
    super(app, keycloak);
    this.logger = getLogger();
  }

  /**
   * @inheritDoc
   */
  public async createOperation(req: Request, res: Response) {
    if (!this.hasRealmRole(req, ApplicationRoles.CREATE_OPERATIONS)) {
      this.sendForbidden(res, "You do not have permission to create operations");
      return;
    }

    const operation: Operation = _.isObject(req.body) ? req.body as any : null;
    if (!operation) {
      this.sendBadRequest(res, "Failed to parse body");
      return;
    }

    const type = operation.type;
    if (!type) {
      this.sendBadRequest(res, "Missing type");
      return;
    }

    let operationReport;

    switch (type) {
      case OPERATION_SAP_CONTACT_SYNC:
        operationReport = await this.startManualContactsUpdateOperation();
      break;
      case OPERATION_ITEM_GROUP_DEFAULT_DOCUMENT_TEMPLATES:
        operationReport = await this.createItemGroupDefaultDocumentTemplates();
      break;
      default:
        this.sendBadRequest(res, `Invalid type ${type}`);
      return;
    }

    if (!operationReport) {
      this.sendInternalServerError(res, "Failed to create operation report");
      return;
    }

    const result: Operation = {
      type: operation.type,
      operationReportId: operationReport.externalId
    };

    res.status(200).send(result);
  }

  /**
   * Manually creates a task to sync SAP business partners with contacts
   */
  private async startManualContactsUpdateOperation() {
    try {
      const operationReport = await models.createOperationReport("SAP_CONTACT_SYNC");

      tasks.enqueueSapContactUpdate(operationReport.id);

      return operationReport;
    } catch (e) {
      this.logger.error(`Failed to start import contacts update operation. Error: ${e}`);
      return;
    }
  }

  /**
   * Creates yearly default document templates for an item group
   *
   * @return {Promise} promise for an operation report
  */
  private async createItemGroupDefaultDocumentTemplates() {
    const itemGroups = await models.listItemGroups(null);
    const operationReport = await models.createOperationReport("ITEM_GROUP_DEFAULT_DOCUMENT_TEMPLATES");
    const type = this.inTestMode() ? "2019" : `${(new Date()).getFullYear()}`;

    Promise.all(itemGroups.map(async (itemGroup) => {
      try {
        const hasDocumentTemplate = !!(await models.findItemGroupDocumentTemplateByTypeAndItemGroupId(type, itemGroup.id));
        const message = hasDocumentTemplate ? `Item group ${itemGroup.name} already had template ${type}` : `Added document template ${type} for item group ${itemGroup.name}`;
        if (!hasDocumentTemplate) {
          const documentTemplate = await models.createDocumentTemplate("Insert Contents", null, null);
          await models.createItemGroupDocumentTemplate(type, itemGroup.id, documentTemplate.id);
        }

        return await models.createOperationReportItem(operationReport.id, message, true, true);
      } catch (e) {
        return await models.createOperationReportItem(operationReport.id, `Failed item group template synchronization with following message ${e}`, true, false);
      }
    }));

    return operationReport;
  }

  /**
   * Returns whether system is running in test mode
   */
  private inTestMode() {
    return config().mode === "TEST";
  }

}