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

  const OPERATION_SAP_CONTACT_SYNC = "SAP_CONTACT_SYNC";
  const OPERATION_SAP_ITEM_GROUP_SYNC = "SAP_ITEM_GROUP_SYNC";
  const OPERATION_SAP_CONTRACT_SYNC = "SAP_CONTRACT_SYNC";
  
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
     */
    constructor (logger, models, tasks) {
      super();
      
      this.logger = logger;
      this.models = models;
      this.tasks = tasks;
    }

    /**
     * @inheritDoc 
     */
    async createOperation(req, res) {
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
        case OPERATION_SAP_ITEM_GROUP_SYNC:
        case OPERATION_SAP_CONTRACT_SYNC:
          operationReport = await this.readSapImportFileTask(type);
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
        const data = await this.parseXmlFile(config.get("sap:import-file"));
        if (!data) {
          this.logger.error("Failed to read SAP import file");
          return;
        }

        const sap = data.SAP;
        if (!sap) {
          this.logger.error("Could not find SAP root entry");
          return;
        }

        switch (type) {
          case OPERATION_SAP_CONTACT_SYNC:
            return this.readSapImportBusinessPartners(sap);
          case OPERATION_SAP_ITEM_GROUP_SYNC:
            return this.readSapImportItemGroups(sap);
          case OPERATION_SAP_CONTRACT_SYNC:
            return this.readSapImportContracts(sap);
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
     * @param {Object} sap SAP data object 
     */
    async readSapImportContracts(sap) {
      if (!sap.Contracts) {
        this.logger.error("Failed to read SAP contracts");
        return;
      }

      const contracts = sap.Contracts.Contracts;
      if (!contracts) {
        this.logger.error("Failed to read SAP contracts list");
        return;
      }

      const operationReport = await this.models.createOperationReport("SAP_CONTRACT_SYNC");

      contracts.forEach((contract) => {
        for (let i = 0; i < contract.ContractLines.ContractLine.length; i++) {
          this.tasks.enqueueSapContractUpdate(operationReport.id, contract, i);
        }
      });

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

