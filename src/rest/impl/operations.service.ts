import * as _ from "lodash";
import * as Keycloak from "keycloak-connect";
import { Response, Request, Application } from "express";
import { getLogger, Logger } from "log4js";
import { Operation } from "../model/models";
import models from "../../models";
import ApplicationRoles from "../application-roles";
import OperationsService from "../api/operations.service";
import tasks from "../../tasks";
import { config } from "../../config";
import SapServiceFactory from "../../sap/service-layer-client";

const OPERATION_SAP_CONTACT_SYNC = "SAP_CONTACT_SYNC";
const OPERATION_SAP_DELIVERY_PLACE_SYNC = "SAP_DELIVERY_PLACE_SYNC";
const OPERATION_SAP_ITEM_GROUP_SYNC = "SAP_ITEM_GROUP_SYNC";
const OPERATION_SAP_CONTRACT_SYNC = "SAP_CONTRACT_SYNC";
const OPERATION_SAP_CONTRACT_SAPID_SYNC = "SAP_CONTRACT_SAPID_SYNC";
const OPERATION_ITEM_GROUP_DEFAULT_DOCUMENT_TEMPLATES = "ITEM_GROUP_DEFAULT_DOCUMENT_TEMPLATES";
const OPERATION_UPDATE_CURRENT_YEAR_APPROVED_CONTRACTS_TO_SAP = "UPDATE_CURRENT_YEAR_APPROVED_CONTRACTS_TO_SAP";

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
    
    const operation: Operation = _.isObject(req.body) ? req.body : null;
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
        operationReport = await this.readSapImportBusinessPartners();
      break;
      case OPERATION_SAP_DELIVERY_PLACE_SYNC:
        operationReport = await this.readSapImportDeliveryPlaces();
      break;
      case OPERATION_SAP_ITEM_GROUP_SYNC:
        operationReport = await this.readSapImportItemGroups();
      break;
      case OPERATION_SAP_CONTRACT_SYNC:
        operationReport = await this.readSapImportContracts();
      break;
      case OPERATION_ITEM_GROUP_DEFAULT_DOCUMENT_TEMPLATES:
        operationReport = await this.createItemGroupDefaultDocumentTemplates();
      break;
      case OPERATION_SAP_CONTRACT_SAPID_SYNC:
        operationReport = await this.createSapContractSapIds();
      break;
      case OPERATION_UPDATE_CURRENT_YEAR_APPROVED_CONTRACTS_TO_SAP:
        operationReport = await this.updateCurrentYearApprovedContractsToSap();
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
   * Reads business partners from SAP and fills related task queue with data
   */
  private async readSapImportBusinessPartners() {
    try {
      const sapBusinessPartnersService = SapServiceFactory.getBusinessPartnersService();
      const businessPartners = await sapBusinessPartnersService.listBusinessPartners();
      const operationReport = await models.createOperationReport("SAP_CONTACT_SYNC");

      businessPartners.forEach(businessPartner =>
        tasks.enqueueSapContactUpdate(operationReport.id, businessPartner)
      );

      return operationReport;
    } catch (e) {
      this.logger.error(`Failed to read SAP item groups. error: ${e}`);
      return;
    }
  }

  /**
   * Reads delivery places from SAP and fills related task queue with data
   */
  private async readSapImportDeliveryPlaces() {
    try {
      const sapDeliveryPlacesService = SapServiceFactory.getDeliveryPlacesService();
      const deliveryPlaces = await sapDeliveryPlacesService.listDeliveryPlaces();
      const operationReport = await models.createOperationReport(OPERATION_SAP_DELIVERY_PLACE_SYNC);

      deliveryPlaces.forEach((deliveryPlace) => {
        tasks.enqueueSapDeliveryPlaceUpdate(operationReport.id, deliveryPlace);
      });
  
      return operationReport;
    } catch (e) {
      this.logger.error(`Failed to read SAP item groups. error: ${e}`);
      return;
    }
  }

  /**
   * Reads item groups from SAP and fills related task queue with data
   */
  private async readSapImportItemGroups() {
    try {
      const sapItemGroupsService = SapServiceFactory.getItemGroupsService();
      const itemGroups = await sapItemGroupsService.listItemGroups();
      const operationReport = await models.createOperationReport("SAP_ITEM_GROUP_SYNC");

      itemGroups.forEach((itemGroup) => {
        tasks.enqueueSapItemGroupUpdate(operationReport.id, itemGroup);
      });

      return operationReport;
    } catch (e) {
      this.logger.error(`Failed to read SAP item groups. error: ${e}`);
      return;
    }
  }

  /**
   * Reads contracts from SAP and fills related task queue with data
   */
  private async readSapImportContracts() {
    try {
      const sapContractsService = SapServiceFactory.getContractsService();
      const contracts = await sapContractsService.listContracts();
      const operationReport = await models.createOperationReport("SAP_CONTRACT_SYNC");
  
      contracts.forEach(contract =>
        contract.BlanketAgreements_ItemsLines.forEach(contractLine =>
          tasks.enqueueSapContractUpdate(operationReport.id, contract, contractLine)
        )
      );
  
      return operationReport;
    } catch (e) {
      this.logger.error(`Failed to read SAP contracts. error: ${e}`);
      return;
    }
    
  }

  /**
   * Creates missing SAP IDs into approved contracts
   */
  private async createSapContractSapIds() {
    const operationReport = await models.createOperationReport("SAP_CONTRACT_SAPID_SYNC");
    const contracts = await models.listContractsByStatusAndSapIdIsNull("APPROVED");
    for (let i = 0; i < contracts.length; i++) {
      const contract = contracts[i];
      tasks.enqueueSapContractSapIdSyncTask(operationReport.id, contract.id);
    }

    return operationReport;
  }

/**
 * Updates current year approved contracts to SAP
 *
 * @returns created operation report
 */
  private updateCurrentYearApprovedContractsToSap = async () => {
    const operationReport = await models.createOperationReport("UPDATE_CURRENT_YEAR_APPROVED_CONTRACTS_TO_SAP");
    const contracts = await models.listContractsByStatusAndYear("APPROVED", new Date().getFullYear());
    for (const contract of contracts) {
      tasks.enqueueUpdateCurrentYearApprovedContractsToSap(operationReport.id, contract);
    }

    return operationReport;
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