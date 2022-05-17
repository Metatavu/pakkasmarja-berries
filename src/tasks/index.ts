import * as _ from "lodash";
import { getLogger, Logger } from "log4js";
import models, { ContractModel, ChatGroupModel, ThreadModel } from "../models";
import * as Queue from "better-queue";
import * as SQLStore from "better-queue-sql";
import userManagement, { UserProperty } from "../user-management";
import { config } from "../config";
import UserRepresentation from "keycloak-admin/lib/defs/userRepresentation";
import chatThreadPermissionController, { CHAT_THREAD_SCOPES } from "../user-management/chat-thread-permission-controller";
import chatGroupPermissionController, { CHAT_GROUP_SCOPES } from "../user-management/chat-group-permission-controller";
import { CHAT_GROUP_TRAVERSE } from "../rest/application-scopes";
import { createStackedReject, logReject } from "../utils";
import RolePolicyRepresentation from 'keycloak-admin/lib/defs/rolePolicyRepresentation';
import { ChatGroupType } from '../rest/model/chatGroupType';
import { HttpError, SapAddressType, SapBusinessPartner } from "../generated/erp-services-client/api";
import ErpClient from "../erp/client";

/**
 * Task queue functionalities for Pakkasmarja Berries
 */
export default new class TaskQueue {

  private logger: Logger;
  private sapContactUpdateQueue: Queue;
  private sapContractDeliveredQuantityUpdateQueue: Queue;
  private questionGroupThreadsQueue: Queue;
  private chatPermissionsCacheQueue: Queue;

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
    this.questionGroupThreadsQueue = this.createQueue("questionGroupThreadsQueue", this.checkQuestionGroupUsersThreadsTask);
    this.chatPermissionsCacheQueue = this.createQueue("chatPermissionsCacheQueue", this.cacheUsersChatPermissionsTask);

    if (!this.inTestMode()) {
      this.enqueueSapContactUpdate();
      this.enqueueContractDeliveredQuantityUpdateQueue();
      this.enqueueQuestionGroupUsersThreadsTask();
      this.enqueueCacheUsersChatPermissionsTask();
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

      let resultMessage = `SAP contacts update finished. Results:\n${updateResults.join("\n")}`;

      this.logger.info(resultMessage);

      callback(null, {
        message: resultMessage,
        operationReportItemId: operationReportItemId
      });
    } catch (error) {
      const errorMessage = error instanceof HttpError ?
        `${error.statusCode} - ${error.message}` :
        error.toString();

      const reason = `Error processing queue - ${errorMessage}`;

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
      const errorMessage = error instanceof HttpError ?
        `${error.statusCode} - ${error.message}` :
        error.toString();

      const reason = `Error processing queue ${errorMessage}`;
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
   * Adds task to chat permissions cache queue
   */
  private enqueueCacheUsersChatPermissionsTask = () => {
    this.chatPermissionsCacheQueue.push({id: 1});
  }

  /**
   * Task engine task for caching user permissions
   *
   * @param data data
   * @param callback callback
   */
  private cacheUsersChatPermissionsTask = async (data: any, callback: Queue.ProcessFunctionCb<any>) => {
    try {
      await this.cacheUsersChatPermissions();
    } finally {
      callback(null);
    }
  }

  /**
   * Caches users chat permissions
   */
  private cacheUsersChatPermissions = async () => {
    this.logger.info("Updating users chat permissions");

    const users = await userManagement.listAllUsers();
    const chatGroups = await models.listChatGroups(ChatGroupType.CHAT);

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
  private enqueueQuestionGroupUsersThreadsTask = () => {
    this.questionGroupThreadsQueue.push({id: 1});
  }

  /**
   * Task engine task for checking question group user threads
   *
   * @param data data
   * @param callback callback
   */
  private checkQuestionGroupUsersThreadsTask = async (data: any, callback: Queue.ProcessFunctionCb<any>) => {
    try {
      await this.checkQuestionGroupUsersThreads();
    } finally {
      callback(null);
    }
  }

  /**
   * Checks question group user threads
   */
  private checkQuestionGroupUsersThreads = async () => {
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

    const allRolePolicies = await userManagement.listRolePolicies()
    const userRolePolicies: RolePolicyRepresentation[] = []
    const userRoleIds = (await userManagement.listUserRoles(user)).map((role) => role.id)

    allRolePolicies.forEach((rolePolicy) => {
      (rolePolicy.roles || []).forEach((policyRole) => {
        if (userRoleIds.includes(policyRole.id)) {
          userRolePolicies.push(rolePolicy)
        }
      });
    });

    const roleScopes = await chatGroupPermissionController.getUserRoleChatGroupScopes(chatGroup, userRolePolicies);
    allScopes = allScopes.concat(roleScopes);

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
  private removeUserChatGroupUnreads = async (chatGroup: ChatGroupModel, user: UserRepresentation): Promise<void> => {
    await models.deleteUnreadsByPathLikeAndUserId(`chat-${chatGroup.id}-%`, user.id!);
  }

  /**
   * Returns whether application is in test mode or not
   */
  private inTestMode = () => config().mode === "TEST";

}
