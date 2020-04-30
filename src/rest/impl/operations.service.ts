import * as _ from "lodash";
import * as Keycloak from "keycloak-connect";
import * as fs from "fs";
import * as xml2js from "xml2js";
import { Response, Request, Application } from "express";
import { getLogger, Logger } from "log4js";
import { Operation } from "../model/models";
import models from "../../models";
import ApplicationRoles from "../application-roles";
import OperationsService from "../api/operations.service";
import tasks from "../../tasks";
import { SAPExportRoot } from "../../sap/export";
import { SAPImportFile, config } from "../../config";

const OPERATION_SAP_CONTACT_SYNC = "SAP_CONTACT_SYNC";
const OPERATION_SAP_DELIVERY_PLACE_SYNC = "SAP_DELIVERY_PLACE_SYNC";
const OPERATION_SAP_ITEM_GROUP_SYNC = "SAP_ITEM_GROUP_SYNC";
const OPERATION_SAP_CONTRACT_SYNC = "SAP_CONTRACT_SYNC";
const OPERATION_SAP_CONTRACT_SAPID_SYNC = "SAP_CONTRACT_SAPID_SYNC";
const OPERATION_ITEM_GROUP_DEFAULT_DOCUMENT_TEMPLATES = "ITEM_GROUP_DEFAULT_DOCUMENT_TEMPLATES";

interface SAPData {
  data: SAPExportRoot,
  status: string
}

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
      case OPERATION_SAP_DELIVERY_PLACE_SYNC:
      case OPERATION_SAP_ITEM_GROUP_SYNC:        
      case OPERATION_SAP_CONTRACT_SYNC:
        operationReport = await this.readSapImportFileTask(type);
        break;
      case OPERATION_ITEM_GROUP_DEFAULT_DOCUMENT_TEMPLATES:
        operationReport = await this.createItemGroupDefaultDocumentTemplates();
        break;
      case OPERATION_SAP_CONTRACT_SAPID_SYNC:
        operationReport = await this.createSapContractSapIds();
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
   * Reads import file from sap and fills tasks queues with data from file
   */
  private async readSapImportFileTask(type: string) {
    try {
      const importFiles: SAPImportFile[] = config().sap["import-files"];
      const datas = await Promise.all(this.parseXmlFiles(importFiles.map((importFile: SAPImportFile) => {
        return importFile.file;
      })));

      if (!datas) {
        this.logger.error("Failed to read SAP import files");
        return;
      }

      const sapDatas: SAPData[] = datas.map((data: any, index: number) => {
        return {
          data: data.SAP,
          status: importFiles[index].status
        };
      });
      
      if (!sapDatas) {
        this.logger.error("Could not find SAP root entry");
        return null;
      }

      const activeSapData: any = sapDatas.filter((sapData) => {
        return sapData.status === "APPROVED";
      }).pop();

      switch (type) {
        case OPERATION_SAP_CONTACT_SYNC:
          return this.readSapImportBusinessPartners(activeSapData.data);
        case OPERATION_SAP_DELIVERY_PLACE_SYNC:
          return this.readSapImportDeliveryPlaces(activeSapData.data);
        case OPERATION_SAP_ITEM_GROUP_SYNC:
          return this.readSapImportItemGroups(activeSapData.data);
        case OPERATION_SAP_CONTRACT_SYNC:
          return this.readSapImportContracts(sapDatas);
      }

    } catch (e) {
      this.logger.error(`Failed to parse SAP import file ${e}`);
    }

    return null;
  }

  /**
   * Reads business partners from sap and fills related task queue with data from file
   * 
   * @param {Object} sap SAP data object 
   */
  private async readSapImportBusinessPartners(sap: any) {
    if (!sap.BusinessPartners) {
      this.logger.error("Failed to read SAP business parterns");
      return;
    }

    const businessPartners = sap.BusinessPartners.BusinessPartners;
    if (!businessPartners) {
      this.logger.error("Failed to read SAP business parterns list");
      return;
    }

    const operationReport = await models.createOperationReport("SAP_CONTACT_SYNC");

    businessPartners.forEach((businessPartner: any) => {
      tasks.enqueueSapContactUpdate(operationReport.id, businessPartner);
    });

    return operationReport;
  }

  /**
   * Reads delivery places from sap and fills related task queue with data from file
   * 
   * @param {Object} sap SAP data object 
   */
  private async readSapImportDeliveryPlaces(sap: SAPExportRoot) {
    if (!sap.DeliveryPlaces) {
      this.logger.error("Failed to read SAP item groups");
      return;
    }

    const deliveryPlaces = sap.DeliveryPlaces.DeliveryPlaces;
    if (!deliveryPlaces) {
      this.logger.error("Failed to read SAP delivery places list");
      return;
    }

    const operationReport = await models.createOperationReport(OPERATION_SAP_DELIVERY_PLACE_SYNC);
    deliveryPlaces.forEach((deliveryPlace) => {
      tasks.enqueueSapDeliveryPlaceUpdate(operationReport.id, deliveryPlace);
    });

    return operationReport;
  }

  /**
   * Reads item groups from sap and fills related task queue with data from file
   * 
   * @param {Object} sap SAP data object 
   */
  private async readSapImportItemGroups(sap: SAPExportRoot) {
    if (!sap.ItemGroups) {
      this.logger.error("Failed to read SAP item groups");
      return;
    }

    const itemGroups = sap.ItemGroups.ItemGroup;
    if (!itemGroups) {
      this.logger.error("Failed to read SAP item group list");
      return;
    }

    const operationReport = await models.createOperationReport("SAP_ITEM_GROUP_SYNC");

    itemGroups.forEach((itemGroup) => {
      tasks.enqueueSapItemGroupUpdate(operationReport.id, itemGroup);
    });

    return operationReport;
  }

  /**
   * Reads contracts from SAP and fills related task queue with data from file
   * 
   * @param {Object[]} sapDatas Array of SAP data objects
   */
  private async readSapImportContracts(sapDatas: SAPData[]) {
    const operationReport = await models.createOperationReport("SAP_CONTRACT_SYNC");
    sapDatas.forEach((sapData) => {
      const sap = sapData.data;
      const status = sapData.status;
      if (sap.Contracts) {
        const contracts = sap.Contracts.Contracts;
        if (!contracts) {
          this.logger.error("Failed to read SAP contracts list");
          return;
        }
  
        contracts.forEach((contract) => {
          for (let i = 0; i < contract.ContractLines.ContractLine.length; i++) {
            tasks.enqueueSapContractUpdate(operationReport.id, contract, i, status);
          }
        });
      }
    });

    return operationReport;
  }

  /**
   * Creates missing SAP ids into approved contracts 
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
   * Read a file as Promise
   * 
   * @param {String} file path to file
   * @return {Promise} promise for file data 
   */
  private readFile(file: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      fs.readFile(file, (err: NodeJS.ErrnoException, data: Buffer) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }

  /**
   * Parses XML string into object
   * 
   * @param {String} data XML string
   * @returns {Promise} promise for parsed object  
   */
  private parseXml(data: Buffer): Promise<any> {
    return new Promise((resolve, reject) => {
      const options = {
        explicitArray: false
      };

      xml2js.parseString(data, options, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }
  
  /**
   * Parses XML files into array of objects
   * 
   * @param {String} file path to file
   * @returns {Promise} promise for parsed objects
   */
  private parseXmlFiles(files: string[]): Promise<any>[] {
    return files.map((file) => {
      return this.parseXmlFile(file);
    });
  }
  
  /**
   * Parses XML file into object
   * 
   * @param {String} file path to file
   * @returns {Promise} promise for parsed object 
   */
  private parseXmlFile(file: string): Promise<any> {
    return this.readFile(file)
      .then((data: Buffer) => {
        return this.parseXml(data);
      });
  }

  /**
   * Returns whether system is running in test mode
   */
  private inTestMode() {
    return config().mode === "TEST";
  }

}