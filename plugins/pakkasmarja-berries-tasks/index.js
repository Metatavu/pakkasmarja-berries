/* jshint esversion: 6 */
/* global __dirname, Promise */
(() => {
  "use strict";
  
  const Promise = require("bluebird");
  const path = require("path");
  const fs = require("fs");
  const config = require("nconf");
  const Queue = require("better-queue");
  const SQLStore = require("better-queue-sql");
  const xml2js = require("xml2js");

  /**
   * Task queue functionalities for Pakkasmarja Berries
   */
  class TaskQueue {
    
    /**
     * Constructor
     * 
     * @param {Object} logger logger
     * @param {Object} models database models
     * @param {Object} signature signature functionalities
     */
    constructor (logger, models, signature, userManagement) {
      this.logger = logger;
      this.signature = signature;
      this.models = models;
      this.userManagement = userManagement;

      this.createQueue("contractDocumentStatus", this.checkContractDocumentSignatureStatusTask.bind(this));
      this.createQueue("contractDocumentStatusBatch", this.fillCheckContractDocumentSignatureStatusQueueTask.bind(this));
      this.createQueue("readSapImportFile", this.readSapImportFileTask.bind(this));
      this.createQueue("sapContactUpdate", this.sapContactUpdateTask.bind(this));

      this.enqueueContractDocumentStatusBatchQueue();
      this.enqueueReadSapImportFile();
    }

    /**
     * Creates new task queue
     * 
     * @param {String} name name
     * @param {Function} fn fn
     */
    createQueue(name, fn) {
      this[`${name}Queue`] = new Queue(fn, config.get(`tasks:queues:${name}`));
      this[`${name}Queue`].use(new SQLStore({
        dialect: "mysql",
        tableName: `${config.get("tasks:tableName")}_${name}`,
        dbname: config.get("mysql:database"),
        host: config.get("mysql:host") || "localhost",
        port: config.get("mysql:port") || 3306,
        username: config.get("mysql:username"),
        password: config.get("mysql:password")
      }));
    }

    /**
     * Creates document thru Visma Sign API
     * 
     * @param {String} name name
     * @returns {Promise} Promise that resolves to the created document
     */
    createDocument(name) {
      return this.documentsApi.createDocument({"document":{"name": name}}).then((data) => {
        const location = data.location;
        return location.substring(location.lastIndexOf("/") + 1);
      });
    }

    /**
     * Adds task to contractDocumentStatusQueue
     * 
     * @param {int} contractDocumentId id
     */
    enqueueContractDocumentStatusTask(contractDocumentId) {
      this.contractDocumentStatusQueue.push({id: contractDocumentId, contractDocumentId: contractDocumentId});
    }
    
    /**
     * Adds task to contractDocumentStatusBatchQueue
     */
    enqueueContractDocumentStatusBatchQueue() {
      this.contractDocumentStatusBatchQueue.push({id: 1});
    }

    /** 
     * Enqueues import file synchronization from SAP
     */
    enqueueReadSapImportFile() {
      this.readSapImportFileQueue.push({id: 1});
    }
    
    /**
     * Enqueues SAP contact update task
     * 
     * @param {Object} businessPartner SAP business partner object 
     */
    enqueueSapContactUpdate(businessPartner) {
      this.sapContactUpdateQueue.push({
        id: businessPartner.CardCode,
        businessPartner: businessPartner
      });
    }

    /**
     * Reads import file from sap and fills tasks queues with data from file
     * 
     * @param data task data
     * @param callback callback method 
     */
    async readSapImportFileTask(data, callback) {
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

        if (!sap.BusinessPartners) {
          this.logger.error("Failed to read SAP business parterns");
          return;
        }

        const businessPartners = sap.BusinessPartners.BusinessPartners;
        if (!businessPartners) {
          this.logger.error("Failed to read SAP business parterns list");
          return;
        }

        businessPartners.forEach((businessPartner) => {
          this.enqueueSapContactUpdate(businessPartner);
        });
      } catch (e) {
        this.logger.error("Failed to parse SAP import file", e);
      } finally {
        callback(null);
        this.enqueueReadSapImportFile();
      }
    }

    /**
     * Fills the checkContractDocumentSignatureStatus queue with unsigned contract documents
     */
    async fillCheckContractDocumentSignatureStatusQueueTask(data, callback) {
      try {
        const unsignedContractDocuments = await this.models.listContractDocumentsBySigned(false);
        unsignedContractDocuments.forEach((unsignedContractDocument) => {
          this.enqueueContractDocumentStatusTask(unsignedContractDocument.id);
        });
      } catch (err) {
        this.logger.error("Error processing queue", err);
      } finally {
        callback(null);
        this.enqueueContractDocumentStatusBatchQueue();
      }
    }
    
    /**
     * Task to check contract document signature status from visma sign
     * 
     * @param {object} data data given to task
     * @param {function} callback callbackcheckContractDocumentSignatureStatus function
     */
    async checkContractDocumentSignatureStatusTask(data, callback) {
      let documentSigned = false;
      try {
        const contractDocument = await this.models.findContractDocumentById(data.contractDocumentId);
        if (!contractDocument.signed) {
          const response = await this.signature.getDocumentStatus(contractDocument.vismaSignDocumentId);
          const documentStatus = response ? response.status : null;
          if (documentStatus === "signed") {
            documentSigned = true;
            this.models.updateContractDocumentSigned(data.contractDocumentId, true);
          }
        } else {
          documentSigned = true;
        }
      } catch(err) {
        this.logger.error("Error finding document status with", err);
      } finally {
        if (!documentSigned) {
          this.enqueueContractDocumentStatusTask(data.contractDocumentId);
        }
        callback(null);
      }
    }

    /**
     * Executes a SAP contact update task
     * 
     * @param {Object} data task data
     * @param {Function} callback task callback 
     */
    async sapContactUpdateTask(data, callback) {
      try {
        const businessPartner = data.businessPartner;
        const sapId = businessPartner.CardCode.trim();
        const email = businessPartner.Email.trim();
        const companyName = businessPartner.CardName.trim();
        const phone1 = businessPartner.Phone1.trim();
        const phone2 = businessPartner.Phone2.trim();
        const billStreet = businessPartner.BillStreet.trim();
        const billZip = businessPartner.BillZipCode.trim();
        const billCity = businessPartner.BillCity.trim();
        const shipStreet = businessPartner.ShipStreet.trim();
        const shipZip = businessPartner.ShipZipCode.trim();
        const shipCity = businessPartner.ShipCity.trim();
        const iban = businessPartner.IBAN.trim();
        const bic = businessPartner.BIC.trim();
        const taxCode = businessPartner.FederalTaxID.trim();
        const vatLiable = businessPartner.VatLiable.trim();
        const audit = businessPartner.Audit.trim();
        
        let user = await this.userManagement.findUserByProperty(this.userManagement.ATTRIBUTE_SAP_ID, sapId);
        if (!user) {
          user = await this.userManagement.findUserByEmail(email);
        }

        if (!user) {
          this.logger.error(`Could not find user with SAP id ${sapId} nor with email ${email}`);
          callback(`Could not find user with SAP id ${sapId} nor with email ${email}`);
          return;
        }

        if (email) {
          user.email = email;
        }

        this.userManagement.setSingleAttribute(user, this.userManagement.ATTRIBUTE_SAP_ID, sapId);
        this.userManagement.setSingleAttribute(user, this.userManagement.ATTRIBUTE_PHONE_1, phone1);
        this.userManagement.setSingleAttribute(user, this.userManagement.ATTRIBUTE_PHONE_2, phone2);
        this.userManagement.setSingleAttribute(user, this.userManagement.ATTRIBUTE_COMPANY_NAME, companyName);
        this.userManagement.setSingleAttribute(user, this.userManagement.ATTRIBUTE_BIC, bic);
        this.userManagement.setSingleAttribute(user, this.userManagement.ATTRIBUTE_IBAN, iban);
        this.userManagement.setSingleAttribute(user, this.userManagement.ATTRIBUTE_TAX_CODE, taxCode);
        this.userManagement.setSingleAttribute(user, this.userManagement.ATTRIBUTE_VAT_LIABLE, vatLiable);
        this.userManagement.setSingleAttribute(user, this.userManagement.ATTRIBUTE_AUDIT, audit);
        this.userManagement.setSingleAttribute(user, this.userManagement.ATTRIBUTE_CITY_1, billCity);
        this.userManagement.setSingleAttribute(user, this.userManagement.ATTRIBUTE_POSTAL_CODE_1, billZip);
        this.userManagement.setSingleAttribute(user, this.userManagement.ATTRIBUTE_STREET_1, billStreet);
        this.userManagement.setSingleAttribute(user, this.userManagement.ATTRIBUTE_CITY_2, shipCity);
        this.userManagement.setSingleAttribute(user, this.userManagement.ATTRIBUTE_POSTAL_CODE_2, shipZip);
        this.userManagement.setSingleAttribute(user, this.userManagement.ATTRIBUTE_STREET_2, shipStreet);

        await this.userManagement.updateUser(user);

        callback(null);
      } catch (err) {
        this.logger.error(`Error processing queue ${err}`);
        callback(err);
      }
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
  
  module.exports = (options, imports, register) => {
    const logger = imports["logger"];
    const signature = imports["pakkasmarja-berries-signature"];
    const models = imports["pakkasmarja-berries-models"];
    const userManagement = imports["pakkasmarja-berries-user-management"];
    const tasks = new TaskQueue(logger, models, signature, userManagement);
    
    register(null, {
      "pakkasmarja-berries-tasks": tasks
    });
  };
  
})();