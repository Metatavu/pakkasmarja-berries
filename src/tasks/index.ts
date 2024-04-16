import * as _ from "lodash";
import { getLogger, Logger } from "log4js";
import models, { ContractModel } from "../models";
import * as Queue from "better-queue";
import * as SQLStore from "better-queue-sql";
import userManagement, { UserProperty } from "../user-management";
import { config } from "../config";
import { HttpError, SapAddressType, SapBusinessPartner } from "../generated/erp-services-client/api";
import ErpClient from "../erp/client";
import { UserRepresentation } from "../generated/keycloak-admin-client/models";

/**
 * Task queue functionalities for Pakkasmarja Berries
 */
export default new class TaskQueue {

  private logger: Logger;
  private sapContactUpdateQueue: Queue;
  private sapContractDeliveredQuantityUpdateQueue: Queue;

  /**
   * Saved date of last sync of contacts and SAP business partners
   */
  private contactsLastUpdatedAt: Date | undefined;

  /**
   * Constructor
   *
   * @param {Object} logger logger
   * @param {Object} models database models
   * @param {Object} signature signature functionalities
   */
  constructor () {
    this.logger = getLogger();
    this.contactsLastUpdatedAt = undefined;
  }

  public start = () => {
    this.sapContactUpdateQueue = this.createQueue("sapContactUpdate", this.sapContactUpdateTask);
    this.sapContractDeliveredQuantityUpdateQueue = this.createQueue("sapContractDeliveredQuantityUpdate", this.sapContractDeliveredQuantityUpdateTask);
 
    if (!this.inTestMode()) {
      this.enqueueSapContactUpdate();
      this.enqueueContractDeliveredQuantityUpdateQueue();
    }
  }

  /**
   * Creates new task queue
   *
   * @param {String} name name
   * @param {Function} fn fn
   */
  private createQueue = (name: string, fn: Queue.ProcessFunctionCb<any>): Queue => {
    const queuesConfig: any = config().tasks.queues;

    const options = (queuesConfig || {})[name] || {};

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

    queue.on("task_progress", (taskId: string) => {
      this.logger.info(`[taskqueue] Task with id ${taskId} in queue ${name} progressing...`);
    });

    queue.on("task_finish", (taskId: string, result: any) => {
      this.logger.info(`[taskqueue] Task with id ${taskId} in queue ${name} finished`);

      if (result && result.operationReportItemId) {
        models.updateOperationReportItem(result.operationReportItemId, result.message, true, true);
      }
    });

    queue.on("task_failed", (taskId: string, result: any) => {
      this.logger.warn(`[taskqueue] Task with id ${taskId} in queue ${name} failed`);

      if (result && result.operationReportItemId) {
        models.updateOperationReportItem(result.operationReportItemId, result.message, true, false);
      }
    });

    return queue;
  }

  /**
   * Adds task to sapContractDeliveredQuantityUpdateQueue
   */
  private enqueueContractDeliveredQuantityUpdateQueue = () => {
    this.sapContractDeliveredQuantityUpdateQueue.push({ id: 1 });
  }

  /**
   * Enqueues SAP business partners update task
   *
   * @param operationReportId operation report ID when task is triggered manually
   */
  public enqueueSapContactUpdate = async (operationReportId?: number) => {
    this.sapContactUpdateQueue.push({
      id: 1,
      operationReportItemId: operationReportId ?
        (await models.createOperationReportItem(operationReportId, null, false, false)).id :
        undefined
    });
  }

  /**
   * Executes a SAP contact update task
   *
   * @param {Object} data task data
   * @param {Function} callback task callback
   */
  public sapContactUpdateTask = async (data: any, callback: Queue.ProcessFunctionCb<any>) => {
    const operationReportItemId: number | undefined = data.operationReportItemId;

    try {
      const businessPartnersApi = await ErpClient.getBusinessPartnersApi();
      const updateStartTime = new Date();
      const businessPartnersResult = await businessPartnersApi.listBusinessPartners(
        this.contactsLastUpdatedAt, // updatedAt
        0, // firstResult
        10000 // maxResults
      );
      const businessPartners = businessPartnersResult.body;

      const updateResults: string[] = [];

      for (const businessPartner of businessPartners) {
        try {
          const user = await this.tryUpdateContactFromBusinessPartner(businessPartner);
          updateResults.push(`  ${businessPartner.code}: Synced to user ${user.email || user.username}`);
        } catch (error) {
          updateResults.push(`  ${businessPartner.code}: ${error}`);
        }

        // Wait a bit between requests to ease Keycloak load
        await new Promise<void>(resolve => setTimeout(resolve, 1000));
      }

      this.contactsLastUpdatedAt = this.inTestMode() ? undefined : updateStartTime;

      const displayedResults = updateResults.length ?
        `Results:\n${updateResults.join("\n")}` :
        "Everything up to date.";

      let resultMessage = `SAP contacts update finished. ${displayedResults}`;

      this.logger.info(resultMessage);

      callback(null, {
        message: resultMessage,
        operationReportItemId: operationReportItemId
      });
    } catch (error) {
      const errorMessage = this.stringifyError(error);
      const reason = `Error processing queue: ${errorMessage}`;

      this.logger.error(reason);

      callback({
        message: reason,
        operationReportItemId: operationReportItemId
      });
    }

    if (!this.inTestMode() && !operationReportItemId) {
      this.enqueueSapContactUpdate();
    }
  }

  /**
   * Tries to update contact from given business partner
   *
   * @param businessPartner business partner
   */
  private tryUpdateContactFromBusinessPartner = async (businessPartner: SapBusinessPartner): Promise<UserRepresentation> => {
    try {
      const businessPartnerCode = businessPartner.code;
      const legacySapId = businessPartner.legacyCode;
      const companyName = businessPartner.companyName;
      const phoneNumbers = businessPartner.phoneNumbers;
      const addresses = businessPartner.addresses || [];
      const billingInfo = addresses.find(address => address.type === SapAddressType.Billing);
      const billStreet = billingInfo ? billingInfo.streetAddress : null;
      const billZip = billingInfo ? billingInfo.postalCode : null;
      const billCity = billingInfo ? billingInfo.city : null;
      const shippingInfo = addresses.find(address => address.type === SapAddressType.Delivery);
      const shipStreet = shippingInfo ? shippingInfo.streetAddress : null;
      const shipZip = shippingInfo ? shippingInfo.postalCode : null;
      const shipCity = shippingInfo ? shippingInfo.city : null;
      const bankAccountInfo = businessPartner.bankAccounts ? businessPartner.bankAccounts[0] : undefined;
      const iban = bankAccountInfo ? bankAccountInfo.iban : null;
      const bic = bankAccountInfo ? bankAccountInfo.bic : null;
      const taxCode = businessPartner.federalTaxId;
      const vatLiable = this.translateSapVatLiable(businessPartner.vatLiable);

      let user = await userManagement.findUserByProperty(
        UserProperty.SAP_BUSINESS_PARTNER_CODE,
        businessPartnerCode.toString()
      );

      if (!user && legacySapId) {
        user = await userManagement.findUserByProperty(
          UserProperty.SAP_ID,
          legacySapId.toString()
        );

        if (user) {
          userManagement.setSingleAttribute(user, UserProperty.SAP_BUSINESS_PARTNER_CODE, businessPartnerCode.toString());
          userManagement.setSingleAttribute(user, UserProperty.SAP_ID, undefined);
        }
      }

      if (!user) {
        throw new Error(`Could not find user with code ${businessPartnerCode} nor with legacy code ${legacySapId}`);
      }

      userManagement.setSingleAttribute(user, UserProperty.PHONE_1, phoneNumbers && phoneNumbers.length > 0 ? phoneNumbers[0] : undefined);
      userManagement.setSingleAttribute(user, UserProperty.PHONE_2, phoneNumbers && phoneNumbers.length > 1 ? phoneNumbers[1] : undefined);
      userManagement.setSingleAttribute(user, UserProperty.COMPANY_NAME, companyName);
      userManagement.setSingleAttribute(user, UserProperty.BIC, bic);
      userManagement.setSingleAttribute(user, UserProperty.IBAN, iban);
      userManagement.setSingleAttribute(user, UserProperty.TAX_CODE, taxCode);
      userManagement.setSingleAttribute(user, UserProperty.VAT_LIABLE, vatLiable);
      userManagement.setSingleAttribute(user, UserProperty.CITY_1, billCity);
      userManagement.setSingleAttribute(user, UserProperty.POSTAL_CODE_1, billZip);
      userManagement.setSingleAttribute(user, UserProperty.STREET_1, billStreet);
      userManagement.setSingleAttribute(user, UserProperty.CITY_2, shipCity);
      userManagement.setSingleAttribute(user, UserProperty.POSTAL_CODE_2, shipZip);
      userManagement.setSingleAttribute(user, UserProperty.STREET_2, shipStreet);

      return userManagement.updateUser(user);
    } catch (error) {
      return Promise.reject(`Error: ${error}`);
    }
  }

  /**
   * Executes a SAP contact update task
   *
   * @param {Object} data task data
   * @param {Function} callback task callback
   */
  public sapContractDeliveredQuantityUpdateTask = async (data: any, callback: Queue.ProcessFunctionCb<any>) => {
    try {
      const contractsApi = await ErpClient.getContractsApi();
      const contractsResponse = await contractsApi.listContracts();
      const sapContracts = contractsResponse.body;

      const sapDeliveredQuantities = {};

      sapContracts.forEach(sapContract => {
        sapDeliveredQuantities[sapContract.id!] = sapContract.deliveredQuantity;
      });

      const contracts: ContractModel[] = await models.listContractsByStatusAndSapIdNotNull("APPROVED");
      const totalCount = contracts.length;
      let syncCount = 0;
      const failedSapIds: string[] = [];

      contracts.forEach(contract => {
        const sapId = contract.sapId;
        if (sapId) {
          const deliveredQuantity = sapDeliveredQuantities[sapId];
          if (deliveredQuantity === undefined) {
            failedSapIds.push(sapId);
          } else {
            const deliveredQuantityBefore = contract.deliveredQuantity;
            models.updateContractDeliveredQuantity(contract.id, deliveredQuantity);
            this.logger.info(`Updated delivered quantity of contract ${contract.sapId} from ${deliveredQuantityBefore} into ${deliveredQuantity}`);
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
      const errorMessage = this.stringifyError(error);
      const reason = `Error processing queue: ${errorMessage}`;

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
  private translateSapVatLiable = (sapVatLiable?: SapBusinessPartner.VatLiableEnum) => {
    if (!sapVatLiable) {
      return null;
    }

    switch (sapVatLiable) {
      case SapBusinessPartner.VatLiableEnum.Fi:
        return "YES";
      case SapBusinessPartner.VatLiableEnum.NotLiable:
        return "NO";
      case SapBusinessPartner.VatLiableEnum.Eu:
        return "EU";
      default:
        return null;
    }
  }

  /**
   * Returns whether application is in test mode or not
   */
  private inTestMode = () => config().mode === "TEST";

  /**
   * Returns stringified error message from given error
   *
   * @param error error
   */
  private stringifyError = (error: any) => {
    if (error instanceof HttpError) {
      return `${error.statusCode} - ${error.message}. Response: ${JSON.stringify(error.response, null, 2)}`;
    } else if (error instanceof Error) {
      return `${error.message}: ${error.stack}`;
    } else {
      return JSON.stringify(error);
    }
  }

}
