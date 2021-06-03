import * as _ from "lodash";
import { getLogger, Logger } from "log4js";
import models, { ContractModel, ChatGroupModel, ThreadModel } from "../models";
import * as Queue from "better-queue"; 
import * as SQLStore from "better-queue-sql";
import signature from "../signature";
import userManagement, { UserProperty } from "../user-management";
import { config } from "../config";  
import UserRepresentation from "keycloak-admin/lib/defs/userRepresentation";
import chatThreadPermissionController, { CHAT_THREAD_SCOPES } from "../user-management/chat-thread-permission-controller";
import chatGroupPermissionController, { CHAT_GROUP_SCOPES } from "../user-management/chat-group-permission-controller";
import { CHAT_GROUP_TRAVERSE } from "../rest/application-scopes";
import { SapAddressTypeEnum, SapBPAddress, SapBusinessPartner, SapContract, SapContractLine, SapContractStatusEnum, SapDeliveryPlace, SapItemGroup, SapVatLiableEnum } from "../sap/service-layer-client/types";
import * as moment from "moment";
import SapServiceFactory from "../sap/service-layer-client";
import { createStackedReject, logReject } from "../utils";
import { ContractStatus } from "../rest/model/contractStatus";
import SapContractsServiceImpl from "../sap/impl/contracts";

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
  private updateCurrentYearApprovedContractsToSapQueue: Queue;
  private sapContractSapIdSyncQueue: Queue;
  private sapContractDeliveredQuantityUpdateQueue: Queue;
  private questionGroupThreadsQueue: Queue;
  private chatPermissionsCacheQueue: Queue;

  /**
   * Constructor
   * 
   * @param {Object} logger logger
   * @param {Object} models database models
   * @param {Object} signature signature functionalities
   */
  constructor () {
    this.logger = getLogger();
  }

  public start() {
    this.contractDocumentStatusQueue = this.createQueue("contractDocumentStatus", this.checkContractDocumentSignatureStatusTask.bind(this));
    this.contractDocumentStatusBatchQueue = this.createQueue("contractDocumentStatusBatch", this.fillCheckContractDocumentSignatureStatusQueueTask.bind(this));
    this.sapContactUpdateQueue = this.createQueue("sapContactUpdate", this.sapContactUpdateTask.bind(this));
    this.sapDeliveryPlaceUpdateQueue = this.createQueue("sapDeliveryPlaceUpdate", this.sapDeliveryPlaceUpdateTask.bind(this));
    this.sapItemGroupUpdateQueue = this.createQueue("sapItemGroupUpdate", this.sapItemGroupUpdateTask.bind(this));
    this.sapContractUpdateQueue = this.createQueue("sapContractUpdate", this.sapContractUpdateTask.bind(this));
    this.updateCurrentYearApprovedContractsToSapQueue = this.createQueue("updateCurrentYearApprovedContractsToSap", this.updateCurrentYearApprovedContractsToSapTask.bind(this));
    this.sapContractSapIdSyncQueue = this.createQueue("sapContractSapIdSync", this.sapContractSapIdSyncTask.bind(this));
    this.sapContractDeliveredQuantityUpdateQueue = this.createQueue("sapContractDeliveredQuantityUpdate", this.sapContractDeliveredQuantityUpdateTask.bind(this));
    this.questionGroupThreadsQueue = this.createQueue("questionGroupThreadsQueue", this.checkQuestionGroupUsersThreadsTask.bind(this));
    this.chatPermissionsCacheQueue = this.createQueue("chatPermissionsCacheQueue", this.cacheUsersChatPermissionsTask.bind(this));

    this.enqueueQuestionGroupUsersThreadsTask();
    this.enqueueContractDeliveredQuantityUpdateQueue();
    this.enqueueCacheUsersChatPermissionsTask();
    // FIXME!
    // this.enqueueContractDocumentStatusBatchQueue();
  }

  /**
   * Creates new task queue
   * 
   * @param {String} name name
   * @param {Function} fn fn
   */
  private createQueue(name: string, fn: Queue.ProcessFunctionCb<any>): Queue {
    const queuesConfig: any = config().tasks.queues;

    const options = (queuesConfig || {})[name] || {};
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
  private enqueueContractDeliveredQuantityUpdateQueue() {
    this.sapContractDeliveredQuantityUpdateQueue.push({id: 1});
  }

  /**
   * Enqueues SAP contact update task
   * 
   * @param {Object} businessPartner SAP business partner object 
   */
  async enqueueSapContactUpdate(operationReportId: number, businessPartner: SapBusinessPartner) {
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
  async enqueueSapItemGroupUpdate(operationReportId: number, itemGroup: SapItemGroup) {
    const operationReportItem = await models.createOperationReportItem(operationReportId, null, false, false);

    this.sapItemGroupUpdateQueue.push({
      id: itemGroup.Number,
      itemGroup: itemGroup,
      operationReportItemId: operationReportItem.id
    });
  }

  /**
   * Enqueues SAP delivery place update task
   * 
   * @param operationReportId operation report ID
   * @param {Object} deliveryPlace SAP delivery place object 
   */
  async enqueueSapDeliveryPlaceUpdate(operationReportId: number, deliveryPlace: SapDeliveryPlace) {
    const operationReportItem = await models.createOperationReportItem(operationReportId, null, false, false);

    this.sapDeliveryPlaceUpdateQueue.push({
      id: deliveryPlace.Code,
      deliveryPlace: deliveryPlace,
      operationReportItemId: operationReportItem.id
    });
  }

  /**
   * Enqueues SAP contract update task
   * 
   * @param {String} operationReportId operationReportId
   * @param {Object} contract SAP contract object
   * @param {Object} contractLine SAP contract line object
   */
  async enqueueSapContractUpdate(operationReportId: number, contract: SapContract, contractLine: SapContractLine) {
    const operationReportItem = await models.createOperationReportItem(operationReportId, null, false, false);

    this.sapContractUpdateQueue.push({
      contract: contract,
      contractLine: contractLine,
      operationReportItemId: operationReportItem.id
    });
  }

  /**
   * Enqueues update current year approved contracts to SAP task
   * 
   * @param operationReportId operation report ID
   * @param contract contract model object
   */
  async enqueueUpdateCurrentYearApprovedContractsToSap(operationReportId: number, contract: ContractModel) {
    const operationReportItem = await models.createOperationReportItem(operationReportId, null, false, false);

    this.updateCurrentYearApprovedContractsToSapQueue.push({
      contract: contract,
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
      const businessPartner: SapBusinessPartner = data.businessPartner;
      const sapId = businessPartner.CardCode;
      const email = businessPartner.EmailAddress;
      const companyName = businessPartner.CardName;
      const phone1 = businessPartner.Phone1;
      const phone2 = businessPartner.Phone2;
      const billingInfo = businessPartner.BPAddresses.find((BPAddress: SapBPAddress) => BPAddress.AddressType === SapAddressTypeEnum.BILLING);
      const billStreet = billingInfo ? billingInfo.Street : null;
      const billZip = billingInfo ? billingInfo.ZipCode : null;
      const billCity = billingInfo ? billingInfo.City : null;
      const shippingInfo = businessPartner.BPAddresses.find((BPAddress: SapBPAddress) => BPAddress.AddressType === SapAddressTypeEnum.SHIPPING);
      const shipStreet = shippingInfo ? shippingInfo.Street : null;
      const shipZip = shippingInfo ? shippingInfo.ZipCode : null;
      const shipCity = shippingInfo ? shippingInfo.City : null;
      const bankAccountInfo = businessPartner.BPBankAccounts.length > 0 ? businessPartner.BPBankAccounts[0] : undefined;
      const iban = bankAccountInfo ? bankAccountInfo.IBAN : null;
      const bic = bankAccountInfo ? bankAccountInfo.BICSwiftCode : null;
      const taxCode = businessPartner.FederalTaxID;
      const sapVatLiable = businessPartner.VatLiable;
      const audit = businessPartner.U_audit;
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
    };

    try {
      const contract = await models.findContractById(data.id);
      const userId = contract.userId;
      const year = contract.year;

      const itemGroup = await models.findItemGroupById(contract.itemGroupId);
      if (!itemGroup) {
        throw new Error(`Item group with ID ${contract.itemGroupId} could not be found`);
      }

      const user = await userManagement.findUser(userId);
      if (!user) {
        throw new Error(`User with user ID "${userId}" could not be found`);
      }

      const itemGroupSapId = itemGroup.sapId;
      if (!itemGroupSapId) {
        throw new Error(`Item group SAP ID could not be resolved`);
      }
      
      const userSapId = userManagement.getSingleAttribute(user, UserProperty.SAP_ID);
      if (!userSapId) {
        throw new Error(`User SAP ID could not be resolved`);
      }

      const sapContractsService = SapServiceFactory.getContractsService();
      const userActiveSapContracts = await sapContractsService.listActiveContractsByBusinessPartner(userSapId);
      if (!userActiveSapContracts) {
        throw new Error(`Failed to list SAP contracts for user with SAP ID "${userSapId}"`);
      }

      const sapContract = (
        userActiveSapContracts.find(contract => contract.Status === SapContractStatusEnum.APPROVED) ||
        userActiveSapContracts.find(contract => contract.Status === SapContractStatusEnum.ON_HOLD) ||
        userActiveSapContracts.find(contract => contract.Status === SapContractStatusEnum.DRAFT)
      );

      if (!sapContract) {
        throw new Error(`Active SAP contract could not be found`);
      }

      const contractLines = sapContract.BlanketAgreements_ItemsLines;
      if (contractLines.every(line => line.ItemGroup !== Number(itemGroupSapId))) {
        throw new Error(`Contract ${contract.id} SAP creation failed because SAP contract did not contain lines for item group in App contract`);
      }

      if (!sapContract.DocNum) {
        throw new Error(`Contract ${contract.id} SAP creation failed because SAP contract did not have document number`);
      }

      const contractSapId = `${year}-${sapContract.DocNum}-${itemGroupSapId}`;
      if (!contractSapId) {
        throw new Error(`Contract SAP ID could not be resolved`);
      }

      await models.updateContractSapId(contract.id, contractSapId);

      const successMessage = `Contract ${contract.id} SAP id changed to ${contractSapId}`;

      this.logger.info(successMessage);
      callback(null, {
        message: successMessage,
        operationReportItemId: data.operationReportItemId
      });
    } catch (error) {
      return failTask(`Contract ${data.id} SAP ID creation failed. Reason: ${error}`);
    }
  }

  /**
   * Executes a SAP contact update task
   * 
   * @param {Object} data task data
   * @param {Function} callback task callback 
   */
  async sapContractDeliveredQuantityUpdateTask(data: any, callback: Queue.ProcessFunctionCb<any>) {
    try {
      const sapContractsService = SapServiceFactory.getContractsService();
      const sapContracts = await sapContractsService.listContracts();

      const sapDeliveredQuantities = {};

      sapContracts.forEach((sapContract) => {
        const sapContractLines = sapContract.BlanketAgreements_ItemsLines;
        sapContractLines.forEach(sapContractLine => {
          const { AgreementNo, StartDate } = sapContract;
          const { ItemGroup, CumulativeQuantity } = sapContractLine;

          if (!AgreementNo || !StartDate || !ItemGroup) {
            return;
          }

          const year = moment(StartDate).format("YYYY");
          const sapId = `${year}-${AgreementNo}-${ItemGroup}`;

          if (CumulativeQuantity && CumulativeQuantity > 0) {
            sapDeliveredQuantities[sapId] = sapDeliveredQuantities[sapId] ?
              sapDeliveredQuantities[sapId] + CumulativeQuantity :
              CumulativeQuantity;
          }
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
        this.logger.error(`Could not find following contracts from SAP ${failedSapIds.join(",")}`);
      }

      const successMessage = `Synchronized contract ${syncCount} / ${totalCount} delivered quantities from SAP`;

      this.logger.info(successMessage);
      callback(null, {
        message: successMessage,
        operationReportItemId: data.operationReportItemId
      });
    } catch (error) {
      const reason = `Error processing queue ${error}`;
      this.logger.error(reason);
      callback({
        message: reason,
        operationReportItemId: data.operationReportItemId
      });
    }

    this.enqueueContractDeliveredQuantityUpdateQueue();
  }

  /**
   * Translates vat liable value from SAP into format used by application
   * 
   * @param {SapVatLiableEnum | null} sapVatLiable vat liable from SAP
   * @requires {String} vat liable in application format
   */
  private translateSapVatLiable(sapVatLiable: SapVatLiableEnum | null) {
    switch (sapVatLiable) {
      case SapVatLiableEnum.Y:
        return "YES";
      case SapVatLiableEnum.N:
        return "NO";
      case SapVatLiableEnum.EU:
        return "EU";
      case null:
      default:
        return null;
    }
  }

  /**
   * Executes a SAP delivery place update task
   * 
   * @param {Object} data task data
   * @param {Function} callback task callback 
   */
  private async sapDeliveryPlaceUpdateTask(data: any, callback: Queue.ProcessFunctionCb<any>) {
    try {
      const sapDeliveryPlace: SapDeliveryPlace = data.deliveryPlace;
      const sapId = sapDeliveryPlace.Code;
      if (!sapId) {
        this.logger.error(`Could not find SapId from delivery place`);
        callback({
          message: "Could not find SapId from delivery place",
          operationReportItemId: data.operationReportItemId
        });
        return;
      }

      const name = sapDeliveryPlace.Name;
      if (!name) {
        this.logger.error(`Could not find name from delivery place with SapId ${sapId}`);
        callback({
          message: `Could not find name from delivery place with SapId ${sapId}`,
          operationReportItemId: data.operationReportItemId
        });
        return;
      }

      const deliveryPlace = await models.findDeliveryPlaceBySapId(sapId);
      if (deliveryPlace) {
        models.updateDeliveryPlace(deliveryPlace.id, name);
        
        callback(null, {
          message: `Updated delivery place from SAP ${name} / ${sapId}`,
          operationReportItemId: data.operationReportItemId
        });
      } else {
        models.createDeliveryPlace(sapId, name);

        callback(null, {
          message: `Created new delivery place from SAP ${name} / ${sapId}`,
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
      const sapItemGroup: SapItemGroup = data.itemGroup;
      const sapId = `${sapItemGroup.Number}`;
      const name = sapItemGroup.GroupName;
      if (!name) {
        callback({
          message: `Failed to resolve SAP item group ${sapId} name`,
          operationReportItemId: data.operationReportItemId
        });
        return;
      }

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
      const sapContract: SapContract = data.contract;
      const sapContractLine: SapContractLine = data.contractLine;
      const status = this.resolveSapContractStatus(sapContract);
      const sapItemGroupId = `${sapContractLine.ItemGroup}`;
      const sapDeliveryPlaceId = sapContractLine.U_PFZ_ToiP;
      const sapUserId = sapContract.BPCode;
      const year = moment(sapContract.StartDate ? sapContract.StartDate : undefined).year();
      const sapId = `${year}-${sapContract.DocNum}-${sapItemGroupId}`;
      
      const deliveryPlace = await models.findDeliveryPlaceBySapId(sapDeliveryPlaceId || "");
      if (!deliveryPlace) {
        callback({
          message: `Failed to synchronize SAP contract ${sapId} because delivery place ${sapDeliveryPlaceId} was not found from the system`,
          operationReportItemId: data.operationReportItemId
        });

        return;
      }

      const itemGroup = await models.findItemGroupBySapId(`${sapItemGroupId}`);
      if (!itemGroup) {
        callback({
          message: `Failed to synchronize SAP contract ${sapId} because item group ${sapItemGroupId} was not found from the system`,
          operationReportItemId: data.operationReportItemId
        });
        
        return;
      }

      const user = await userManagement.findUserByProperty(UserProperty.SAP_ID, sapUserId);
      if (!user || !user.id) {
        callback({
          message: `Failed to synchronize SAP contract ${sapId} because user ${sapUserId} was not found from the system`,
          operationReportItemId: data.operationReportItemId
        });
        
        return;
      }

      const contractQuantity = this.resolveSapContractQuantity(sapContract, sapContractLine);
      if (!contractQuantity) {
        callback({
          message: `Failed to synchronize SAP contract ${sapId} because planned quantity of item group ${sapItemGroupId} was not found from SAP contract`,
          operationReportItemId: data.operationReportItemId
        });
        
        return;
      }

      const deliveredQuantity = sapContractLine.CumulativeQuantity || 0;
      const userId = user.id;
      const itemGroupId = itemGroup.id;
      const deliveryPlaceId = deliveryPlace.id;
      const startDate = sapContract.StartDate ? moment(sapContract.StartDate).toDate() : null;
      const endDate = sapContract.EndDate ? moment(sapContract.EndDate).toDate() : null;
      const signDate = sapContract.SigningDate ? moment(sapContract.SigningDate).toDate() : null;
      const termDate = sapContract.TerminateDate ? moment(sapContract.TerminateDate).toDate() : null;
      let remarks = null;
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
        remarks = contract.remarks;
  
        await models.updateContract(
          contract.id, 
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
          rejectComment
        );
      
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
   * Updates current year approved contracts to SAP
   *
   * @param data task data
   * @param callback task callback
   */
  private updateCurrentYearApprovedContractsToSapTask = async (data: any, callback: Queue.ProcessFunctionCb<any>) => {
    const contract: ContractModel | undefined = data.contract;
    if (!contract) {
      return logReject(createStackedReject("updateCurrentYearApprovedContractsToSap task failed: no contract found from task data"), this.logger);
    }

    const failTask = (reason: string) => {
      callback({
        message: `Failed to update contract ${contract.externalId} because ${reason}`,
        operationReportItemId: data.operationReportItemId
      });
    };

    if (contract.status !== ContractStatus.APPROVED) {
      return failTask("contract status was not APPROVED");
    }

    if (contract.year !== new Date().getFullYear()) {
      return failTask("contract year was not current year");
    }

    const deliveryPlace = await models.findDeliveryPlaceById(contract.deliveryPlaceId);
    if (!deliveryPlace) {
      return failTask("contract delivery place was not found");
    }

    const itemGroup = await models.findItemGroupById(contract.itemGroupId);
    if (!itemGroup) {
      return failTask("contract item group was not found");
    }

    const itemGroupSapId = itemGroup.sapId;
    if (!itemGroupSapId) {
      return failTask(`Item group SAP ID could not be resolved`);
    }

    try {
      const sapContract = await SapContractsServiceImpl.createOrUpdateSapContract(contract, deliveryPlace, itemGroup);
      await models.updateContractSapId(contract.id, `${contract.year}-${sapContract.DocNum}-${itemGroupSapId}`);
    } catch (error) {
      logReject(createStackedReject("Could not update contract to SAP", error), this.logger);
      return failTask(error);
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
   * Resolves status for given SAP contract
   * 
   * @param contract SAP contract
   * @returns status as string
   */
  private resolveSapContractStatus(contract: SapContract) {
    if (contract.Status === SapContractStatusEnum.TERMINATED) {
      return "TERMINATED";
    } else {
      return "APPROVED";
    }
  }

  /**
   * Resolves contract quantity from given SAP contract and SAP contract line
   * 
   * @param sapContract SAP contract object
   * @param sapContractLine SAP contract line object
   */
  private resolveSapContractQuantity(sapContract: SapContract, sapContractLine: SapContractLine) {
    const itemGroup = sapContractLine.ItemGroup;
    if (!itemGroup) {
      return undefined;
    }

    const quantityPropertyKey = `U_TR_${itemGroup}`;
    const quantity: number | undefined = sapContract[quantityPropertyKey];
    if (!quantity || typeof quantity !== "number") {
      return undefined;
    }

    return quantity;
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
   * Adds task to chat permissions cache queue
   */
  private enqueueCacheUsersChatPermissionsTask() {
    this.chatPermissionsCacheQueue.push({id: 1});
  }

  /**
   * Task engine task for caching user permissions
   * 
   * @param data data
   * @param callback callback
   */
  private async cacheUsersChatPermissionsTask(data: any, callback: Queue.ProcessFunctionCb<any>) {
    try {
      await this.cacheUsersChatPermissions();
    } finally {
      callback(null);
    }
  }

  /**
   * Caches users chat permissions
   */
  private async cacheUsersChatPermissions() {
    this.logger.info("Updating users chat permissions");

    const users = await userManagement.listAllUsers();
    const chatGroups = await models.listChatGroups(null);

    for (let i = 0; i < users.length; i++) {
      const user = users[i];

      try {
        const permittedGroupIds = [];
        this.logger.info(`Caching permissions for user ${user.username} (${i + 1}/${users.length})`);

        for (let j = 0; j < chatGroups.length; j++) {
          if (await this.cacheUserChatGroupPermissions(chatGroups[j], user)) {
            permittedGroupIds.push(chatGroups[j].id);
          }
        }

        const chatThreads = await models.listThreads(permittedGroupIds);
        for (let n = 0; n < chatThreads.length; n++) {
          await this.cacheUserChatThreadPermissions(chatThreads[n], user);
        }
      } catch (error) {
        logReject(createStackedReject(`Permission caching failed for user ${user.username}`, error), this.logger);
      }
    }

    this.logger.info("Done caching user chat permissions");

    this.logger.info("Starting new task for updating user permissions cache");
    this.enqueueCacheUsersChatPermissionsTask();
  }

  /**
   * Caches users chat group permissions
   * 
   * @param chatGroup chat group
   * @param user user
   */
  private cacheUserChatGroupPermissions = async (chatGroup: ChatGroupModel, user: UserRepresentation): Promise<boolean> => {
    try {
      if (!user.id) {
        return false;
      }
  
      const permittedScopes = await this.getChatGroupPermissionScopes(chatGroup, user);
      const permissionName = chatGroupPermissionController.getChatGroupResourceName(chatGroup);
      let hadAnyPermission = false;
      for (let i = 0; i < CHAT_GROUP_SCOPES.length; i++) {
        let scope = CHAT_GROUP_SCOPES[i];
        let permission = false;
        if (permittedScopes.indexOf(scope) > -1) {
          permission = true;
          hadAnyPermission = true;
        }
  
        await userManagement.updateCachedPermission(permissionName, [scope], user.id, permission);
      }
      return hadAnyPermission;
    } catch (error) {
      logReject(createStackedReject(`Failed to cache chat group permissions for user ${user.id}`, error), this.logger);
      return Promise.reject(error);
    }
  }

  /**
   * Caches users chat thread permissions
   * 
   * @param chatGroup chat group
   * @param user user
   */
  private cacheUserChatThreadPermissions = async (chatThread: ThreadModel, user: UserRepresentation) => {
    try {
      if (!user.id) {
        return;
      }
  
      const permittedScopes = await this.getChatThreadPermissionScopes(chatThread, user);
      const permissionName = chatThreadPermissionController.getChatThreadResourceName(chatThread);
  
      for (let i = 0; i < CHAT_THREAD_SCOPES.length; i++) {
        let scope = CHAT_GROUP_SCOPES[i];
        let permission = false;
        if (permittedScopes.indexOf(scope) > -1) {
          permission = true;
        }
  
        await userManagement.updateCachedPermission(permissionName, [scope], user.id, permission);
      }
    } catch (error) {
      logReject(createStackedReject(`Failed to cache chat thread permissions for user ${user.id}`, error), this.logger);
    }
  }

  /**
   * Adds task to sapContractDeliveredQuantityUpdateQueue
   */
  private enqueueQuestionGroupUsersThreadsTask() {
    this.questionGroupThreadsQueue.push({id: 1});
  }
  
  /**
   * Task engine task for checking question group user threads
   * 
   * @param data data
   * @param callback callback
   */
  private async checkQuestionGroupUsersThreadsTask(data: any, callback: Queue.ProcessFunctionCb<any>) {
    try {
      await this.checkQuestionGroupUsersThreads();
    } finally {
      callback(null);
    }
  }

  /**
   * Checks question group user threads
   */
  private async checkQuestionGroupUsersThreads() {
    this.logger.info("Checking question group user threads...");

    const users = await userManagement.listAllUsers();
    const questionGroups = await models.listChatGroups("QUESTION");

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      for (let j = 0; j < questionGroups.length; j++) {
        await this.checkUserQuestionGroupThread(questionGroups[j], user);
      }
    }

    this.logger.info("Done checking question group user threads.");

    this.enqueueQuestionGroupUsersThreadsTask();
  }

  /**
   * Ensures that user has proper thread in given question chat group
   * 
   * @param chatGroup chat group
   * @param user user
   */
  private checkUserQuestionGroupThread = async (chatGroup: ChatGroupModel, user: UserRepresentation) => {
    const expectedAccess = await this.hasChatGroupTraversePermission(chatGroup, user);
    
    if (!expectedAccess) {
      this.removeUserQuestionGroupThreadAccess(chatGroup, user);
    } else {
      this.addUserQuestionGroupThreadAccess(chatGroup, user);
    }
  }

  /**
   * Ensures that given user has does not have access to a thread in given question group 
   * 
   * @param chatGroup group
   * @param user user
   */
  private removeUserQuestionGroupThreadAccess = async (chatGroup: ChatGroupModel, user: UserRepresentation) => {
    await this.removeUserChatGroupUnreads(chatGroup, user);

    const chatThread = await models.findThreadByGroupIdAndOwnerId(chatGroup.id, user.id!);

    if (chatThread) {
      this.logger.info(`Removing access into ${chatThread.id} from user ${user.id}`);
      await chatThreadPermissionController.setUserChatThreadScope(chatThread, user, null);

      const messageCount = await models.countMessagesByThread(chatThread.id);
      if (messageCount == 0) {        
        const accessPermission = await chatThreadPermissionController.findChatThreadPermission(chatThread, "chat-thread:access");
        if (accessPermission && accessPermission.id) {
          this.logger.info(`Delete access permission from empty chat thread ${chatThread.id}`);
          await userManagement.deletePermission(accessPermission.id);
        }
        
        this.logger.info(`Deleting empty question chat thread ${chatThread.id} from user ${user.id}`);
        await models.deleteThread(chatThread.id);
      } else {
        this.logger.info(`Refused to remove chat thread ${chatThread.id} because it contained ${messageCount} messages`);
      }
    }
  }

  /**
   * Ensures that given user has access to a thread in given question group 
   * 
   * @param chatGroup group
   * @param user user
   */
  private addUserQuestionGroupThreadAccess = async (chatGroup: ChatGroupModel, user: UserRepresentation) => {
    let chatThread = await models.findThreadByGroupIdAndOwnerId(chatGroup.id, user.id!);    
    const title = userManagement.getUserDisplayName(user) || "";

    if (!chatThread) {
      this.logger.info(`Creating new question group ${chatGroup.id} thread for user ${user.id}`);
      chatThread = await models.createThread(chatGroup.id, user.id || null, title, null, "question", null, "TEXT", false, null);
    } else {
      await models.updateThreadTitle(chatThread.id, title);
    }
    
    let resource = await chatThreadPermissionController.findChatThreadResource(chatThread);
    if (!resource) {
      this.logger.info(`Creating new resource for chat thread ${chatThread.id}`);
      resource = await chatThreadPermissionController.createChatThreadResource(chatThread);
    }

    let accessPermission = await chatThreadPermissionController.findChatThreadPermission(chatThread, "chat-thread:access");
    if (!accessPermission) {
      this.logger.info(`Creating new access permission for chat thread ${chatThread.id}`);
      await chatThreadPermissionController.createChatThreadPermission(chatThread, resource, "chat-thread:access", []);
    }

    const scope = await chatThreadPermissionController.getUserChatThreadScope(chatThread, user);
    if (scope !== "chat-thread:access") {
      this.logger.info(`Granting user ${user.id} access into ${chatThread.id}`);
      await chatThreadPermissionController.setUserChatThreadScope(chatThread, user, "chat-thread:access");
    }
  }

  /**
   * Returns whether user has traverse permission for given user group
   * 
   * @param chatGroup chat group
   * @param user user
   * @returns whether user has traverse permission for given user group
   */
  private hasChatGroupTraversePermission = async (chatGroup: ChatGroupModel, user: UserRepresentation): Promise<boolean> => {
    const userGroups = await userManagement.listUserUserGroups(user);

    for (let i = 0; i < userGroups.length; i++) {
      const userGroup = userGroups[i];
      const scope = await chatGroupPermissionController.getUserGroupChatGroupScope(chatGroup, userGroup);
      if (scope == CHAT_GROUP_TRAVERSE) {
        return true;
      }
    }

    return false;
  }

  /**
   * Gets list of allowed scopes for groups resource
   * 
   * @param chatGroup chat group
   * @param user user
   * @returns list of allowed scopes for user
   */
  private getChatGroupPermissionScopes = async (chatGroup: ChatGroupModel, user: UserRepresentation): Promise<string[]> => {
    const userGroups = await userManagement.listUserUserGroups(user);
    let allScopes: string[] = [];
    for (let i = 0; i < userGroups.length; i++) {
      const userGroup = userGroups[i];
      let groupScopes = await chatGroupPermissionController.getUserGroupChatGroupScopes(chatGroup, userGroup);
      allScopes = allScopes.concat(groupScopes);
    }

    return allScopes;
  }

  /**
   * Gets list of allowed scopes for threads resource
   * 
   * @param chatThread chat thread
   * @param user user
   * @returns list of allowed scopes for user
   */
  private getChatThreadPermissionScopes = async (chatThread: ThreadModel, user: UserRepresentation): Promise<string[]> => {
    return await chatThreadPermissionController.getUserChatThreadScopes(chatThread, user);
  }

  /**
   * Removes all unreads from an user to a chat group
   * 
   * @param chatGroup chat group
   * @param user user
   */
  private async removeUserChatGroupUnreads(chatGroup: ChatGroupModel, user: UserRepresentation): Promise<void>  {
    await models.deleteUnreadsByPathLikeAndUserId(`chat-${chatGroup.id}%`, user.id!);
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

}
