/*jshint esversion: 6 */
/* global __dirname */

(() => {
  "use strict";

  const _ = require("lodash");
  const xml2js = require("xml2js");
  const config = require("nconf");
  const fs = require("fs");
  const AbstractOperationsService = require(`${__dirname}/../service/operations-service`);
  const Operation = require(`${__dirname}/../model/operation`);
  const ApplicationRoles = require(`${__dirname}/../application-roles`);

  const OPERATION_SAP_CONTACT_SYNC = "SAP_CONTACT_SYNC";
  const OPERATION_SAP_DELIVERY_PLACE_SYNC = "SAP_DELIVERY_PLACE_SYNC";
  const OPERATION_SAP_ITEM_GROUP_SYNC = "SAP_ITEM_GROUP_SYNC";
  const OPERATION_SAP_CONTRACT_SYNC = "SAP_CONTRACT_SYNC";
  const OPERATION_SAP_CONTRACT_SAPID_SYNC = "SAP_CONTRACT_SAPID_SYNC";
  const OPERATION_ITEM_GROUP_DEFAULT_DOCUMENT_TEMPLATES = "ITEM_GROUP_DEFAULT_DOCUMENT_TEMPLATES";
  
  /**
   * Implementation for Operation REST service
   */
  class OperationsServiceImpl extends AbstractOperationsService {
    
    /**
     * Constructor for OperationService service
     * 
     * @param {Object} logger logger
     * @param {Object} models models
     * @param {Object} tasks tasks
     * @param {Object} userManagement user management
     */
    constructor (logger, models, tasks, userManagement) {
      super();
      
      this.logger = logger;
      this.models = models;
      this.tasks = tasks;
      this.userManagement = userManagement;
    }

    /**
     * @inheritDoc 
     */
    async createOperation(req, res) {
      if (!this.hasRealmRole(req, ApplicationRoles.CREATE_OPERATIONS)) {
        this.sendForbidden(res, "You do not have permission to create operations");
        return;
      }
      
      const operation = _.isObject(req.body) ? Operation.constructFromObject(req.body) : null;
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

      res.status(200).send(Operation.constructFromObject({
        type: operation.type,
        operationReportId: operationReport.externalId
      }));
    }

    /**
     * Reads import file from sap and fills tasks queues with data from file
     * 
     * @param callback callback method 
     */
    async readSapImportFileTask(type) {
      try {
        const importFiles = config.get("sap:import-files");
        const datas = await Promise.all(this.parseXmlFiles(importFiles.map((importFile) => {
          return importFile.file;
        })));

        if (!datas) {
          this.logger.error("Failed to read SAP import files");
          return;
        }

        const sapDatas = datas.map((data, index) => {
          return {
            data: data.SAP,
            status: importFiles[index].status
          };
        });
        
        if (!sapDatas) {
          this.logger.error("Could not find SAP root entry");
          return;
        }

        const activeSapData = sapDatas.filter((sapData) => {
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
    }

    /**
     * Reads business partners from sap and fills related task queue with data from file
     * 
     * @param {Object} sap SAP data object 
     */
    async readSapImportBusinessPartners(sap) {
      if (!sap.BusinessPartners) {
        this.logger.error("Failed to read SAP business parterns");
        return;
      }

      const businessPartners = sap.BusinessPartners.BusinessPartners;
      if (!businessPartners) {
        this.logger.error("Failed to read SAP business parterns list");
        return;
      }

      const operationReport = await this.models.createOperationReport("SAP_CONTACT_SYNC");

      businessPartners.forEach((businessPartner) => {
        this.tasks.enqueueSapContactUpdate(operationReport.id, businessPartner);
      });

      return operationReport;
    }

    /**
     * Reads delivery places from sap and fills related task queue with data from file
     * 
     * @param {Object} sap SAP data object 
     */
    async readSapImportDeliveryPlaces(sap) {
      if (!sap.DeliveryPlaces) {
        this.logger.error("Failed to read SAP item groups");
        return;
      }

      const deliveryPlaces = sap.DeliveryPlaces.DeliveryPlaces;
      if (!deliveryPlaces) {
        this.logger.error("Failed to read SAP delivery places list");
        return;
      }

      const operationReport = await this.models.createOperationReport(OPERATION_SAP_DELIVERY_PLACE_SYNC);
      deliveryPlaces.forEach((deliveryPlace) => {
        this.tasks.enqueueSapDeliveryPlaceUpdate(operationReport.id, deliveryPlace);
      });

      return operationReport;
    }

    /**
     * Reads item groups from sap and fills related task queue with data from file
     * 
     * @param {Object} sap SAP data object 
     */
    async readSapImportItemGroups(sap) {
      if (!sap.ItemGroups) {
        this.logger.error("Failed to read SAP item groups");
        return;
      }

      const itemGroups = sap.ItemGroups.ItemGroup;
      if (!itemGroups) {
        this.logger.error("Failed to read SAP item group list");
        return;
      }

      const operationReport = await this.models.createOperationReport("SAP_ITEM_GROUP_SYNC");

      itemGroups.forEach((itemGroup) => {
        this.tasks.enqueueSapItemGroupUpdate(operationReport.id, itemGroup);
      });

      return operationReport;
    }

    /**
     * Reads contracts from SAP and fills related task queue with data from file
     * 
     * @param {Object[]} sapDatas Array of SAP data objects
     */
    async readSapImportContracts(sapDatas) {
      const operationReport = await this.models.createOperationReport("SAP_CONTRACT_SYNC");
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
              this.tasks.enqueueSapContractUpdate(operationReport.id, contract, i, status);
            }
          });
        }
      });

      return operationReport;
    }

    /**
     * Creates missing SAP ids into approved contracts 
     */
    async createSapContractSapIds() {
      const operationReport = await this.models.createOperationReport("SAP_CONTRACT_SAPID_SYNC");
      const contracts = await this.models.listContractsByStatusAndSapIdIsNull("APPROVED");
      for (let i = 0; i < contracts.length; i++) {
        const contract = contracts[i];
        this.tasks.enqueueSapContractSapIdSyncTask(operationReport.id, contract.id);
      }

      return operationReport;
    }

    /** 
     * Creates yearly default document templates for an item group
     * 
     * @return {Promise} promise for an operation report
    */
    async createItemGroupDefaultDocumentTemplates() {
      const itemGroups = await this.models.listItemGroups();
      const operationReport = await this.models.createOperationReport("ITEM_GROUP_DEFAULT_DOCUMENT_TEMPLATES");
      const type = `${(new Date()).getFullYear()}`;
      const operationReportItems = Promise.all(itemGroups.map(async (itemGroup) => {
        try {
          const hasDocumentTemplate = !!(await this.models.findItemGroupDocumentTemplateByTypeAndItemGroupId(type, itemGroup.id)); 
          const message = hasDocumentTemplate ? `Item group ${itemGroup.name} already had template ${type}` : `Added document template ${type} for item group ${itemGroup.name}`;
          if (!hasDocumentTemplate) {
            const documentTemplate = await this.models.createDocumentTemplate("Insert Contents", null, null);
            const itemGroupDocumentTemplate = await this.models.createItemGroupDocumentTemplate(type, itemGroup.id, documentTemplate.id); 
          }

          return await this.models.createOperationReportItem(operationReport.id, message, true, true);
        } catch (e) {
          return await this.models.createOperationReportItem(operationReport.id, `Failed item group template synchronization with following message ${e}`, true, false);
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
    readFile(file) {
      return new Promise((resolve, reject) => {
        fs.readFile(file, (err, data) => {
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
    parseXml(data) {
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
    parseXmlFiles(files) {
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
    parseXmlFile(file) {
      return this.readFile(file)
        .then((data) => {
          return this.parseXml(data);
        });
    }
  }

  module.exports = OperationsServiceImpl;

})();

