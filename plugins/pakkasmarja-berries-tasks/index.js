/* jshint esversion: 6 */
/* global __dirname, Promise */
(() => {
  "use strict";
  
  const Promise = require("bluebird");
  const config = require("nconf");
  const Queue = require("better-queue");
  const SQLStore = require("better-queue-sql");

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
      this.createQueue("sapContactUpdate", this.sapContactUpdateTask.bind(this));
      this.createQueue("sapDeliveryPlaceUpdate", this.sapDeliveryPlaceUpdateTask.bind(this));
      this.createQueue("sapItemGroupUpdate", this.sapItemGroupUpdateTask.bind(this));
      this.createQueue("sapContractUpdate", this.sapContractUpdateTask.bind(this));

      this.enqueueContractDocumentStatusBatchQueue();
    }

    /**
     * Creates new task queue
     * 
     * @param {String} name name
     * @param {Function} fn fn
     */
    createQueue(name, fn) {
      const options = config.get(`tasks:queues:${name}`) || {};
      this[`${name}Queue`] = new Queue(fn, options);
      this[`${name}Queue`].use(new SQLStore({
        dialect: "mysql",
        tableName: `${config.get("tasks:tableName")}_${name}`,
        dbname: config.get("mysql:database"),
        host: config.get("mysql:host") || "localhost",
        port: config.get("mysql:port") || 3306,
        username: config.get("mysql:username"),
        password: config.get("mysql:password")
      }));

      this[`${name}Queue`].on("task_finish", (taskId, result) => {
        if (result && result.operationReportItemId) {
          this.models.updateOperationReportItem(result.operationReportItemId, result.message, true, true);
        }
      });

      this[`${name}Queue`].on("task_failed", (taskId, result) => {
        if (result && result.operationReportItemId) {
          this.models.updateOperationReportItem(result.operationReportItemId, result.message, true, false);
        }
      });
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
     * Enqueues SAP contact update task
     * 
     * @param {Object} businessPartner SAP business partner object 
     */
    async enqueueSapContactUpdate(operationReportId, businessPartner) {
      const operationReportItem = await this.models.createOperationReportItem(operationReportId, null, false, false);

      this.sapContactUpdateQueue.push({
        id: businessPartner.CardCode,
        businessPartner: businessPartner,
        operationReportItemId: operationReportItem.id
      });
    }

    /**
     * Enqueues SAP item group update task
     * 
     * @param {Object} itemGroup SAP item group object 
     */
    async enqueueSapItemGroupUpdate(operationReportId, itemGroup) {
      const operationReportItem = await this.models.createOperationReportItem(operationReportId, null, false, false);

      this.sapItemGroupUpdateQueue.push({
        id: itemGroup.ItemGroupCode,
        itemGroup: itemGroup,
        operationReportItemId: operationReportItem.id
      });
    }

    /**
     * Enqueues SAP delivery place update task
     * 
     * @param {Object} deliveryPlace SAP delivery place object 
     */
    async enqueueSapDeliveryPlaceUpdate(operationReportId, deliveryPlace) {
      const operationReportItem = await this.models.createOperationReportItem(operationReportId, null, false, false);

      this.sapDeliveryPlaceUpdateQueue.push({
        id: deliveryPlace.PlaceCode,
        deliveryPlace: deliveryPlace,
        operationReportItemId: operationReportItem.id
      });
    }

    /**
     * Enqueues SAP contract update task
     * 
     * @param {Object} contract SAP contract object 
     */
    async enqueueSapContractUpdate(operationReportId, contract, lineIndex) {
      const operationReportItem = await this.models.createOperationReportItem(operationReportId, null, false, false);

      this.sapContractUpdateQueue.push({
        contract: contract,
        lineIndex: lineIndex,
        operationReportItemId: operationReportItem.id
      });
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
        const sapVatLiable = businessPartner.VatLiable.trim();
        const audit = businessPartner.Audit.trim();
        const vatLiable = this.translateSapVatLiable(sapVatLiable);
        
        let user = await this.userManagement.findUserByProperty(this.userManagement.ATTRIBUTE_SAP_ID, sapId);
        if (!user) {
          user = await this.userManagement.findUserByEmail(email);
        }

        if (!user) {
          this.logger.error(`Could not find user with SAP id ${sapId} nor with email ${email}`);
          callback({
            message: `Could not find user with SAP id ${sapId} nor with email ${email}`,
            operationReportItemId: data.operationReportItemId
          });
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

        callback(null, {
          message: `Synchronized contact details from SAP ${email} / ${sapId}`,
          operationReportItemId: data.operationReportItemId
        });
      } catch (err) {
        this.logger.error(`Error processing queue ${err}`);
        callback({
          message: err,
          operationReportItemId: data.operationReportItemId
        });
      }
    }

    /**
     * Translates vat liable value from SAP into format used by application
     * 
     * @param {String} sapVatLiable vat liable from SAP
     * @requires {String} vat liable in appilcation format
     */
    translateSapVatLiable(sapVatLiable) {
      if (!sapVatLiable) {
        return null; 
      }

      switch (sapVatLiable) {
        case 'Y':
          return 'YES';
        case 'N':
          return 'NO';
        case 'EU':
          return 'EU';
      }

      this.logger.error(`Failed to translate ${sapVatLiable} into vat liable value`);

      return null;
    }

    /**
     * Executes a SAP delivery place update task
     * 
     * @param {Object} data task data
     * @param {Function} callback task callback 
     */
    async sapDeliveryPlaceUpdateTask(data, callback) {
      try {
        const sapDeliveryPlace = data.deliveryPlace;
        const sapId = sapDeliveryPlace.PlaceCode;
        const name = sapDeliveryPlace.PlaceName;

        const deliveryPlace = await this.models.findDeliveryPlaceBySapId(sapId);
        if (deliveryPlace) {
          this.models.updateDeliveryPlace(deliveryPlace.id, name);
          
          callback(null, {
            message: `Updated devivery place from SAP ${name} / ${sapId}`,
            operationReportItemId: data.operationReportItemId
          });
        } else {
          this.models.createDeliveryPlace(sapId, name);

          callback(null, {
            message: `Created new devivery place from SAP ${name} / ${sapId}`,
            operationReportItemId: data.operationReportItemId
          });
        }

      } catch (err) {
        this.logger.error(`Error processing delivery place update queue ${err}`);
        callback({
          message: err,
          operationReportItemId: data.operationReportItemId
        });
      }
    }

    /**
     * Executes a SAP item group update task
     * 
     * @param {Object} data task data
     * @param {Function} callback task callback 
     */
    async sapItemGroupUpdateTask(data, callback) {
      try {
        const sapItemGroup = data.itemGroup;
        const sapId = sapItemGroup.ItemGroupCode;
        const name = sapItemGroup.ItemGroupName;

        const itemGroup = await this.models.findItemGroupBySapId(sapId);
        if (itemGroup) {
          this.models.updateItemGroup(itemGroup.id, name);
        } else {
          this.models.createItemGroup(sapId, name);
        }

        callback(null, {
          message: `Synchronized item group details from SAP ${name} / ${sapId}`,
          operationReportItemId: data.operationReportItemId
        });
      } catch (err) {
        this.logger.error(`Error processing item group update queue ${err}`);
        callback({
          message: err,
          operationReportItemId: data.operationReportItemId
        });
      }
    }

    /**
     * Executes a SAP contract update task
     * 
     * @param {Object} data task data
     * @param {Function} callback task callback 
     */
    async sapContractUpdateTask(data, callback) {
      try {
        const sapContract = data.contract;
        const sapContractLine = sapContract.ContractLines.ContractLine[data.lineIndex];
        const sapItemGroupId = sapContractLine.ItemGroupCode;
        const sapDeliveryPlaceId = sapContractLine.PlaceCode;
        const sapUserId = sapContractLine.CardCode;
        const year = sapContract.Year;
        const sapId = `${year}-${sapContract.ContractId}-${sapItemGroupId}`;
        
        const deliveryPlace = await this.models.findDeliveryPlaceBySapId(sapDeliveryPlaceId);
        if (!deliveryPlace) {
          callback({
            message: `Failed to synchronize SAP contract ${sapId} because delivery place ${sapDeliveryPlaceId} was not found from the system`,
            operationReportItemId: data.operationReportItemId
          });

          return;
        }

        const itemGroup = await this.models.findItemGroupBySapId(sapItemGroupId);
        if (!itemGroup) {
          callback({
            message: `Failed to synchronize SAP contract ${sapId} because item group ${sapItemGroupId} was not found from the system`,
            operationReportItemId: data.operationReportItemId
          });
          
          return;
        }

        const user = await this.userManagement.findUserByProperty(this.userManagement.ATTRIBUTE_SAP_ID, sapUserId);
        if (!user) {
          callback({
            message: `Failed to synchronize SAP contract ${sapId} because user ${sapUserId} was not found from the system`,
            operationReportItemId: data.operationReportItemId
          });
          
          return;
        }

        const contractQuantity = sapContractLine.ContractQuantity;
        const deliveredQuantity = sapContractLine.DeliveredQuantity;
        const userId = user.id;
        const itemGroupId = itemGroup.id;
        const deliveryPlaceId = deliveryPlace.id;
        const startDate = null;
        const endDate = null;
        const signDate = null;
        const termDate = null;
        const status = "DRAFT";
        const remarks = null;

        const contract = await this.models.findContractBySapId(sapId);
        if (!contract) {
          await this.models.createContract(userId, deliveryPlaceId, itemGroupId, sapId, contractQuantity, deliveredQuantity, startDate, endDate, signDate, termDate, status, remarks);
          callback(null, {
            message: `Created new contract from SAP ${sapId}`,
            operationReportItemId: data.operationReportItemId
          });
        } else {
          await this.models.updateContract(contract.id, deliveryPlaceId, itemGroupId, contractQuantity, deliveredQuantity, startDate, endDate, signDate, termDate, status, remarks);
          callback(null, {
            message: `Updated contract details from SAP ${sapId}`,
            operationReportItemId: data.operationReportItemId
          });
        }
      } catch (err) {
        this.logger.error(`Error processing contract update queue ${err}`);
        callback({
          message: err,
          operationReportItemId: data.operationReportItemId
        });
      }
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