import * as _ from "lodash";
import * as fs from "fs";
import { getLogger, Logger } from "log4js";
import models, { ContractModel } from "../models";
import * as Queue from "better-queue"; 
import * as SQLStore from "better-queue-sql";
import * as xml2js from "xml2js";
import { SAPExportBusinessPartner, SAPExportItemGroup, SAPExportDeliveryPlace, SAPExportContract, SAPExport, SAPExportRoot } from "../sap/export"; 
import signature from "../signature";
import userManagement, { UserProperty } from "../user-management";
import { SAPImportFile, config } from "../config";  
/**
 * Task queue functionalities for Pakkasmarja Berries
 */
export default new class TaskQueue {

  private logger: Logger;
  private contractDocumentStatusQueue: Queue;
  private contractDocumentStatusBatchQueue: Queue;
  private sapContactUpdateQueue: Queue;
  private sapDeliveryPlaceUpdateQueue: Queue;
  private sapItemGroupUpdateQueue: Queue;
  private sapContractUpdateQueue: Queue;
  private sapContractSapIdSyncQueue: Queue;
  private sapContractDeliveredQuantityUpdateQueue: Queue;

  /**
   * Constructor
   * 
   * @param {Object} logger logger
   * @param {Object} models database models
   * @param {Object} signature signature functionalities
   */
  constructor () {
    this.logger = getLogger();
    this.contractDocumentStatusQueue = this.createQueue("contractDocumentStatus", this.checkContractDocumentSignatureStatusTask.bind(this));
    this.contractDocumentStatusBatchQueue = this.createQueue("contractDocumentStatusBatch", this.fillCheckContractDocumentSignatureStatusQueueTask.bind(this));
    this.sapContactUpdateQueue = this.createQueue("sapContactUpdate", this.sapContactUpdateTask.bind(this));
    this.sapDeliveryPlaceUpdateQueue = this.createQueue("sapDeliveryPlaceUpdate", this.sapDeliveryPlaceUpdateTask.bind(this));
    this.sapItemGroupUpdateQueue = this.createQueue("sapItemGroupUpdate", this.sapItemGroupUpdateTask.bind(this));
    this.sapContractUpdateQueue = this.createQueue("sapContractUpdate", this.sapContractUpdateTask.bind(this));
    this.sapContractSapIdSyncQueue = this.createQueue("sapContractSapIdSync", this.sapContractSapIdSyncTask.bind(this));
    this.sapContractDeliveredQuantityUpdateQueue = this.createQueue("sapContractDeliveredQuantityUpdate", this.sapContractDeliveredQuantityUpdateTask.bind(this));
    // FIXME!
    // this.enqueueContractDeliveredQuantityUpdateQueue();
    // this.enqueueContractDocumentStatusBatchQueue();
  }

  /**
   * Creates new task queue
   * 
   * @param {String} name name
   * @param {Function} fn fn
   */
  createQueue(name: string, fn: Queue.ProcessFunctionCb<any>): Queue {
    const queuesConfig: any = config().tasks.queues;

    const options = queuesConfig || {};
    const queue: Queue = new Queue(fn, options);

    queue.use(new SQLStore({
      dialect: "mysql",
      tableName: `${config().tasks.tableName}_${name}`,
      dbname: config().mysql.database,
      host: config().mysql.host || "localhost",
      port: config().mysql.port || 3306,
      username: config().mysql.username,
      password: config().mysql.password,
      charset: "utf8mb4"
    }));

    queue.on("task_progress", (taskId: string, completed: number, total: number) => {
      this.logger.info(`[taskqueue] Task with id ${taskId} in queue ${name} progressing...`);
    });

    queue.on("task_finish", (taskId: string, result: any) => {
      this.logger.info(`[taskqueue] Task with id ${taskId} in queue ${name} finished`);
      if (result && result.operationReportItemId) {
        models.updateOperationReportItem(result.operationReportItemId, result.message, true, true);
      }
    });

    queue.on("task_failed", (taskId: string, result: any) => {
      this.logger.info(`[taskqueue] Task with id ${taskId} in queue ${name} failed`);
      if (result && result.operationReportItemId) {
        models.updateOperationReportItem(result.operationReportItemId, result.message, true, false);
      }
    });

    return queue;
  }

  /**
   * Adds task to contractDocumentStatusQueue
   * 
   * @param {int} contractDocumentId id
   */
  enqueueContractDocumentStatusTask(contractDocumentId: number) {
    this.contractDocumentStatusQueue.push({id: contractDocumentId, contractDocumentId: contractDocumentId});
  }
  
  /**
   * Adds task to contractDocumentStatusBatchQueue
   */
  enqueueContractDocumentStatusBatchQueue() {
    this.contractDocumentStatusBatchQueue.push({id: 1});
  }
  
  /**
   * Adds task to sapContractDeliveredQuantityUpdateQueue
   */
  enqueueContractDeliveredQuantityUpdateQueue() {
    this.sapContractDeliveredQuantityUpdateQueue.push({id: 1});
  }
  
  /**
   * Enqueues SAP contact update task
   * 
   * @param {Object} businessPartner SAP business partner object 
   */
  async enqueueSapContactUpdate(operationReportId: number, businessPartner: SAPExportBusinessPartner) {
    const operationReportItem = await models.createOperationReportItem(operationReportId, null, false, false);

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
  async enqueueSapItemGroupUpdate(operationReportId: number, itemGroup: SAPExportItemGroup) {
    const operationReportItem = await models.createOperationReportItem(operationReportId, null, false, false);

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
  async enqueueSapDeliveryPlaceUpdate(operationReportId: number, deliveryPlace: SAPExportDeliveryPlace) {
    const operationReportItem = await models.createOperationReportItem(operationReportId, null, false, false);

    this.sapDeliveryPlaceUpdateQueue.push({
      id: deliveryPlace.PlaceCode,
      deliveryPlace: deliveryPlace,
      operationReportItemId: operationReportItem.id
    });
  }

  /**
   * Enqueues SAP contract update task
   * 
   * @param {String} operationReportId operationReportId
   * @param {Object} contract SAP contract object
   * @param {int} lineIndex contract line index
   * @param {String} status contract status
   */
  async enqueueSapContractUpdate(operationReportId: number, contract: SAPExportContract, lineIndex: number, status: string) {
    const operationReportItem = await models.createOperationReportItem(operationReportId, null, false, false);

    this.sapContractUpdateQueue.push({
      contract: contract,
      lineIndex: lineIndex,
      status: status,
      operationReportItemId: operationReportItem.id
    });
  }

  /**
   * Adds task to sapContractSapIdSync queue
   * 
   * @param {int} contractDocumentId id
   * @param {int} contractId id
   */
  async enqueueSapContractSapIdSyncTask(operationReportId: number, contractId: number) {
    const operationReportItem = await models.createOperationReportItem(operationReportId, `Update contract ${contractId} sap id`, false, false);

    this.sapContractSapIdSyncQueue.push({
      id: contractId,
      operationReportItemId: operationReportItem.id
    });
  }

  /**
   * Fills the checkContractDocumentSignatureStatus queue with unsigned contract documents
   */
  async fillCheckContractDocumentSignatureStatusQueueTask(data: any, callback: Queue.ProcessFunctionCb<any>) {
    try {
      const unsignedContractDocuments = await models.listContractDocumentsBySigned(false);
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
  async checkContractDocumentSignatureStatusTask(data: any, callback: Queue.ProcessFunctionCb<any>) {
    try {
      const contractDocument = await models.findContractDocumentById(data.contractDocumentId);
      if (!contractDocument) {
        // Contract document has been removed, resolve task
        callback(null);
        return;
      }

      if (!contractDocument.signed) {
        const response = await signature.getDocumentStatus(contractDocument.vismaSignDocumentId);
        const documentStatus = response ? response.status : null;
        if (documentStatus === "signed") {
          models.updateContractDocumentSigned(data.contractDocumentId, true);
          models.updateContractStatus(contractDocument.contractId, "APPROVED");
        }
      }
    } catch(err) {
      this.logger.error(`Error finding document status with ${err}`);
    } finally {
      callback(null);
    }
  }

  /**
   * Executes a SAP contact update task
   * 
   * @param {Object} data task data
   * @param {Function} callback task callback 
   */
  async sapContactUpdateTask(data: any, callback: Queue.ProcessFunctionCb<any>) {
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

      if (!email) {
        this.logger.error(`Could not synchronize user with SAP id ${sapId} because email is null`);
        
        callback({
          message: `Could not synchronize user with SAP id ${sapId} because email is null`,
          operationReportItemId: data.operationReportItemId
        });

        return;
      }
      
      let user = await userManagement.findUserByProperty(UserProperty.SAP_ID, sapId);
      if (!user) {
        user = await userManagement.findUserByEmail(email);
      }

      if (!user) {
        this.logger.error(`Could not find user with SAP id ${sapId} nor with email ${email}`);
        callback({
          message: `Could not find user with SAP id ${sapId} nor with email ${email}`,
          operationReportItemId: data.operationReportItemId
        });
        return;
      }
      
      userManagement.setSingleAttribute(user, UserProperty.SAP_ID, sapId);
      userManagement.setSingleAttribute(user, UserProperty.PHONE_1, phone1);
      userManagement.setSingleAttribute(user, UserProperty.PHONE_2, phone2);
      userManagement.setSingleAttribute(user, UserProperty.COMPANY_NAME, companyName);
      userManagement.setSingleAttribute(user, UserProperty.BIC, bic);
      userManagement.setSingleAttribute(user, UserProperty.IBAN, iban);
      userManagement.setSingleAttribute(user, UserProperty.TAX_CODE, taxCode);
      userManagement.setSingleAttribute(user, UserProperty.VAT_LIABLE, vatLiable);
      userManagement.setSingleAttribute(user, UserProperty.AUDIT, audit);
      userManagement.setSingleAttribute(user, UserProperty.CITY_1, billCity);
      userManagement.setSingleAttribute(user, UserProperty.POSTAL_CODE_1, billZip);
      userManagement.setSingleAttribute(user, UserProperty.STREET_1, billStreet);
      userManagement.setSingleAttribute(user, UserProperty.CITY_2, shipCity);
      userManagement.setSingleAttribute(user, UserProperty.POSTAL_CODE_2, shipZip);
      userManagement.setSingleAttribute(user, UserProperty.STREET_2, shipStreet);

      await userManagement.updateUser(user);

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
   * Resolves and updates SAP Contract's sapId
   * 
   * @param {Object} data task data
   * @param {Function} callback task callback 
   */
  async sapContractSapIdSyncTask(data: any, callback: Queue.ProcessFunctionCb<any>) {
    const failTask = (reason: string) => {
      this.logger.error(reason);
      callback({
        message: reason,
        operationReportItemId: data.operationReportItemId
      });
      this.enqueueContractDeliveredQuantityUpdateQueue();
    };

    try {
      const sapData = await this.loadSapApprovedData();
      if (!sapData) {
        this.logger.error("Could not find approved SAP data");
        return;
      }

      const sapContracts = sapData.Contracts ? sapData.Contracts.Contracts : null;
      if (!sapContracts) {
        this.logger.error("SAP file does not contain contracts");
        return;
      }

      const contract = await models.findContractById(data.id);
      const userId = contract.userId;
      const year = contract.year;

      const itemGroup = await models.findItemGroupById(contract.itemGroupId);
      if (!itemGroup) {
        return failTask(`Contract ${contract.id} SAP creation failed because item group could not be found`);
      }

      const user = await userManagement.findUser(userId);
      if (!user) {
        return failTask(`Contract ${contract.id} SAP creation failed because user could not be found`);
      }

      const itemGroupSapId = itemGroup.sapId;
      if (!itemGroupSapId) {
        return failTask(`Contract ${contract.id} SAP creation failed because SAP item group id could not be resolved`);
      }
      
      const userSapId = userManagement.getSingleAttribute(user, UserProperty.SAP_ID);
      if (!userSapId) {
        return failTask(`Contract ${contract.id} SAP creation failed because user SAP id could not be resolved`);
      }

      const sapContract = sapContracts
        .filter((sapContract) => {
          return userSapId === sapContract.CardCode;
        })
        .filter((sapContract) => {
          const sapContractLines = Array.isArray(sapContract.ContractLines.ContractLine) ? sapContract.ContractLines.ContractLine : [sapContract.ContractLines.ContractLine];
          return sapContractLines.filter((sapContractLine) => {
            return sapContractLine.ItemGroupCode === itemGroupSapId;
          }).length > 0;      
        })[0];

      if (!sapContract) {
        return failTask(`Contract ${contract.id} SAP creation failed because sap contract could not be resolved`);
      }

      const contractSapId = `${year}-${sapContract.ContractId}-${itemGroupSapId}`;
      if (!contractSapId) {
        return failTask(`Contract ${contract.id} SAP creation failed because contract SAP id could not be resolved`);
      }

      await models.updateContractSapId(contract.id, contractSapId);

      const successMessage = `Contract ${contract.id} SAP id changed to ${contractSapId}`;

      this.logger.info(successMessage);
      callback(null, {
        message: successMessage,
        operationReportItemId: data.operationReportItemId
      });
    } catch (e) {
      return failTask(`Contract ${data.id} SAP creation failed on error ${e}`);
    }
  }

  /**
   * Executes a SAP contact update task
   * 
   * @param {Object} data task data
   * @param {Function} callback task callback 
   */
  async sapContractDeliveredQuantityUpdateTask(data: any, callback: Queue.ProcessFunctionCb<any>) {
    const failTask = (reason: string) => {
      this.logger.error(reason);
      callback({
        message: reason,
        operationReportItemId: data.operationReportItemId
      });
      this.enqueueContractDeliveredQuantityUpdateQueue();
    }

    try {
      const importFiles: SAPImportFile[] = config().sap["import-files"] || [];
      const approvedFile = importFiles.filter((importFile: SAPImportFile) => {
        return importFile.status === "APPROVED";
      })[0];

      if (!approvedFile) {
        return failTask("Could not find SAP file with APPROVED status");
      }

      const sapXml = await this.parseXml(await this.readFile(approvedFile.file));
      const sapData = sapXml.SAP;
      const sapContracts: SAPExportContract[] = sapData.Contracts ? sapData.Contracts.Contracts : null;

      if (!sapContracts) {
        return failTask("SAP file does not contain contracts");
      }

      const sapDeliveredQuantities = {};

      sapContracts.forEach((sapContract) => {
        const sapContractLines = Array.isArray(sapContract.ContractLines.ContractLine) ? sapContract.ContractLines.ContractLine : [sapContract.ContractLines.ContractLine];
        sapContractLines.forEach((sapContractLine) => {
          const sapItemGroupId = sapContractLine.ItemGroupCode;
          const year = sapContract.Year;
          const sapId = `${year}-${sapContract.ContractId}-${sapItemGroupId}`;
          const deliveredQuantity = sapContractLine.DeliveredQuantity;
          sapDeliveredQuantities[sapId] = deliveredQuantity;
        });
      });
      
      const contracts: ContractModel[] = await models.listContractsByStatusAndSapIdNotNull("APPROVED");
      const totalCount = contracts.length;
      let syncCount = 0;
      const failedSapIds: string[] = [];

      contracts.forEach((contract: ContractModel) => {
        const sapId = contract.sapId;
        if (sapId) {
          const deliveredQuantity = sapDeliveredQuantities[sapId];
          if (deliveredQuantity === undefined) {
            failedSapIds.push(sapId);
          } else {
            const deliveredQuantityBefore = contract.deliveredQuantity;
            models.updateContractDeliveredQuantity(contract.id, deliveredQuantity);
            this.logger.info(`Updated delivered quantity of contract ${contract.id} from ${deliveredQuantityBefore} into ${deliveredQuantity}`);
            syncCount++;
          }
        }
      });

      if (failedSapIds.length > 0) {
        this.logger.error(`Could not find following contracts from sap file ${failedSapIds.join(",")}`);
      }

      const successMessage = `Synchronized contract ${syncCount} / ${totalCount} delivered quantities from SAP`;

      this.logger.info(successMessage);
      callback(null, {
        message: successMessage,
        operationReportItemId: data.operationReportItemId
      });

      this.enqueueContractDeliveredQuantityUpdateQueue();
    } catch (err) {
      return failTask(`Error processing queue ${err}`);
    }
  }

  /**
   * Loads SAP data from the approved file
   */
  private async loadSapApprovedData(): Promise<SAPExportRoot | null> {
    const importFiles: SAPImportFile[] = config().sap["import-files"] || [];
    const approvedFile = importFiles.filter((importFile: any) => {
      return importFile.status === "APPROVED";
    })[0];

    if (!approvedFile) {
      return null;
    }

    const sapXml: SAPExport = await this.parseXml(await this.readFile(approvedFile.file));
    return sapXml.SAP;
  }

  /**
   * Translates vat liable value from SAP into format used by application
   * 
   * @param {String} sapVatLiable vat liable from SAP
   * @requires {String} vat liable in appilcation format
   */
  private translateSapVatLiable(sapVatLiable: string) {
    if (!sapVatLiable) {
      return null; 
    }
    
    switch (sapVatLiable) {
      case "Y":
        return "YES";
      case "N":
        return "NO";
      case "EU":
        return "EU";
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
  private async sapDeliveryPlaceUpdateTask(data: any, callback: Queue.ProcessFunctionCb<any>) {
    try {
      const sapDeliveryPlace = data.deliveryPlace;
      const sapId = sapDeliveryPlace.PlaceCode;
      const name = sapDeliveryPlace.PlaceName;

      const deliveryPlace = await models.findDeliveryPlaceBySapId(sapId);
      if (deliveryPlace) {
        models.updateDeliveryPlace(deliveryPlace.id, name);
        
        callback(null, {
          message: `Updated devivery place from SAP ${name} / ${sapId}`,
          operationReportItemId: data.operationReportItemId
        });
      } else {
        models.createDeliveryPlace(sapId, name);

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
  private async sapItemGroupUpdateTask(data: any, callback: Queue.ProcessFunctionCb<any>) {
    try {
      const sapItemGroup = data.itemGroup;
      const sapId = sapItemGroup.ItemGroupCode;
      const name = sapItemGroup.ItemGroupName;
      const displayName = this.resolveSapItemGroupDisplayName(sapId);

      const category = this.resolveSapItemGroupCategory(sapId);
      if (!category) {
        callback({
          message: `Failed to resolve SAP item group ${sapId} category`,
          operationReportItemId: data.operationReportItemId
        });
        return;
      }

      const prerequisiteContractItemGroupId = await this.resolveSapPrerequisiteContractItemGroupId(sapId);
      if (prerequisiteContractItemGroupId === false) {
        await this.enqueueSapItemGroupUpdate(data.operationReportItemId, data.itemGroup);
        
        callback(null, {
          message: "Required prerequisite contract item group was not found, retrying",
          operationReportItemId: data.operationReportItemId
        });

        return;
      }

      const minimumProfitEstimation = this.resolveSapMinimumProfitEstimation(sapId);

      const itemGroup = await models.findItemGroupBySapId(sapId);
      if (itemGroup) {
        models.updateItemGroup(itemGroup.id, name, displayName, category, minimumProfitEstimation, prerequisiteContractItemGroupId);
      } else {
        models.createItemGroup(sapId, name, displayName, category, minimumProfitEstimation, prerequisiteContractItemGroupId);
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
  private async sapContractUpdateTask(data: any, callback: Queue.ProcessFunctionCb<any>) {
    try {
      const sapContract = data.contract;
      const sapContractLine = sapContract.ContractLines.ContractLine[data.lineIndex];
      const status = data.status;
      const sapItemGroupId = sapContractLine.ItemGroupCode;
      const sapDeliveryPlaceId = sapContractLine.PlaceCode;
      const sapUserId = sapContractLine.CardCode;
      const year = parseInt(sapContract.Year);
      const sapId = `${year}-${sapContract.ContractId}-${sapItemGroupId}`;
      
      const deliveryPlace = await models.findDeliveryPlaceBySapId(sapDeliveryPlaceId);
      if (!deliveryPlace) {
        callback({
          message: `Failed to synchronize SAP contract ${sapId} because delivery place ${sapDeliveryPlaceId} was not found from the system`,
          operationReportItemId: data.operationReportItemId
        });

        return;
      }

      const itemGroup = await models.findItemGroupBySapId(sapItemGroupId);
      if (!itemGroup) {
        callback({
          message: `Failed to synchronize SAP contract ${sapId} because item group ${sapItemGroupId} was not found from the system`,
          operationReportItemId: data.operationReportItemId
        });
        
        return;
      }

      const user = await userManagement.findUserByProperty(UserProperty.SAP_ID, sapUserId);
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
      const remarks = null;
      let proposedQuantity = contractQuantity;
      let deliveryPlaceComment = null;
      let quantityComment = null;
      let rejectComment = null;
      let areaDetails = null;
      let deliverAll = false;
      let proposedDeliverAll = false;

      const contract = await models.findContractBySapId(sapId);
      if (!contract) {
        await models.createContract(userId, year, deliveryPlaceId, deliveryPlaceId, itemGroupId, sapId, contractQuantity, deliveredQuantity, proposedQuantity, 
          startDate, endDate, signDate, termDate, status, areaDetails, deliverAll, proposedDeliverAll, remarks, deliveryPlaceComment, quantityComment, rejectComment);

        callback(null, {
          message: `Created new contract from SAP ${sapId}`,
          operationReportItemId: data.operationReportItemId
        });
      } else {
        if (contract.proposedQuantity !== null) {
          proposedQuantity = contract.proposedQuantity;
        }         
        
        deliveryPlaceComment = contract.deliveryPlaceComment;
        quantityComment = contract.quantityComment;
        rejectComment = contract.rejectComment;
        areaDetails = contract.areaDetails;
        deliverAll = contract.deliverAll;
  
        await models.updateContract(contract.id, 
          year, 
          deliveryPlaceId, 
          contract.proposedDeliveryPlaceId, 
          itemGroupId, 
          sapId,
          contractQuantity, 
          deliveredQuantity, 
          proposedQuantity, 
          startDate, 
          endDate, 
          signDate, 
          termDate, 
          status, 
          areaDetails, 
          deliverAll, 
          proposedDeliverAll,
          remarks, 
          deliveryPlaceComment, 
          quantityComment,
          rejectComment);
      
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

  /**
   * Resolves item group category for given SAP id
   * 
   * @param {String} sapId sapId
   */
  private resolveSapItemGroupCategory(sapId: string) {
    const itemGroupCategories = config().sap["item-group-categories"] || {};
    const categories = Object.keys(itemGroupCategories);

    for (let i = 0; i < categories.length; i++) {
      const category = categories[i];
      const sapIds = itemGroupCategories[category];
      if (sapIds.indexOf(sapId) !== -1) {
        return category;
      }
    }

    return null;
  }

  /**
   * Resolves item group minimum profit estimation for given SAP id
   * 
   * @param {String} sapId sapId
   */
  private resolveSapMinimumProfitEstimation(sapId: string) {
    const itemGroupMinimumProfitEstimations = config().sap["item-group-minimum-profit-estimation"] || {};
    return itemGroupMinimumProfitEstimations[sapId] || 0;
  }

  /**
   * Resolves prerequisite contract item group id for given SAP id or null if not specified
   * 
   * @param {String} sapId sapId
   * @return {String} prerequisite contract item group id for given SAP id
   */
  private async resolveSapPrerequisiteContractItemGroupId(sapId: string): Promise<number|null|false> {
    const itemGroupPrerequisites = config().sap["item-group-prerequisites"] || {};
    const prerequisitesSapId = itemGroupPrerequisites[sapId];
    if (!prerequisitesSapId) {
      return null;
    }

    const itemGroup = await models.findItemGroupBySapId(prerequisitesSapId);
    if (itemGroup) {
      return itemGroup.id;
    }

    return false;
  }

  /**
   * Resolves display name for given SAP id
   * 
   * @param {String} sapId sapId
   * @return {String} display name or null if not found
   */
  private resolveSapItemGroupDisplayName(sapId: string) {
    const displayNames = config().sap["item-group-display-names"] || {};
    return displayNames[sapId];
  }

  /**
   * Read a file as Promise
   * 
   * @param {String} file path to file
   * @return {Promise} promise for file data 
   */
  private readFile(file: string): Promise<any> {
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
  private parseXml(data: string): any {
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

}