import * as _ from "lodash";
import * as Sequelize from "sequelize";
import { getLogger, Logger } from "log4js";
import userManagement from "../../user-management";
import GroupRepresentation from "keycloak-admin/lib/defs/groupRepresentation";
import PolicyRepresentation, { DecisionStrategy } from "keycloak-admin/lib/defs/policyRepresentation";
import { ApplicationScope } from "../../rest/application-scopes";
import GroupPolicyRepresentation from "keycloak-admin/lib/defs/groupPolicyRepresentation";
import UserRepresentation from "keycloak-admin/lib/defs/userRepresentation";
import UserPolicyRepresentation from "keycloak-admin/lib/defs/userPolicyRepresentation";
import ResourceRepresentation from "keycloak-admin/lib/defs/resourceRepresentation";

const logger: Logger = getLogger();

const GROUP_SCOPES = ["chat-group:access", "chat-group:manage", "chat-group:traverse"];
const THREAD_SCOPES = ["chat-thread:access"];

type QuestionGroupRole = "manager" | "user";

interface QuestionGroupUserGroup {
  questionGroupId: number,
  userGroupId: string,
  role: QuestionGroupRole
}

interface QuestionGroupUser {
  questionGroupId: number, 
  userId: string, 
  threadId: number
}

interface ThreadUserGroup {
  threadId: number,
  userGroupId: string
}

class PermissionController {

  /**
   * Sets a scope for given user into given chat thread
   * 
   * @param chatThreadId chat thread
   * @param user user
   * @param scope scope
   */
  public async setUserChatThreadScope(chatThreadId: number, user: UserRepresentation, scope: ApplicationScope): Promise<null> {
    const userPolicy = await this.resolveUserPolicy(user.id!);
    if (!userPolicy) {
      return null;
    }

    await this.addChatThreadPermissionPolicy(chatThreadId, scope, userPolicy);

    return null;
  }

  /**
   * Sets a scope for given user group into given chat thread
   * 
   * @param chatThreadId chat thread
   * @param userGroup user group
   * @param scope scope
   */
  public async setUserGroupChatThreadScope(chatThreadId: number, userGroup: GroupRepresentation, scope: ApplicationScope): Promise<null> {
    const groupPolicy = await this.resolveGroupPolicy(userGroup.id!);
    if (!groupPolicy) {
      return null;
    }

    await this.addChatThreadPermissionPolicy(chatThreadId, scope, groupPolicy);

    return null;
  }

  /**
   * Sets a scope for given user group into given chat group
   * 
   * @param chatThreadId chat group
   * @param userGroup user group
   * @param scope scope
   */
  public async setUserGroupChatGroupScope(chatGroupId: number, userGroup: GroupRepresentation, scope: ApplicationScope): Promise<null> {
    const groupPolicy = await this.resolveGroupPolicy(userGroup.id!);
    if (!groupPolicy) {
      return null;
    }

    await this.addChatGroupPermissionPolicy(chatGroupId, scope, groupPolicy);

    return null;
  }

  /**
   * Creates permissions for chat group
   * 
   * @param chatGroupId chat group id
   * @param resource resource
   */
  public async createChatGroupPermissions(chatGroupId: number, resource: ResourceRepresentation) {
    const chatAdminPolicy = await userManagement.findRolePolicyByName("chat-admin");
    
    if (!chatAdminPolicy || !chatAdminPolicy.id) {
      throw new Error("Failed to lookup chat admin policy");
    }

    await this.createChatGroupPermission(chatGroupId, resource, "chat-group:access", []);
    await this.createChatGroupPermission(chatGroupId, resource, "chat-group:manage", [ chatAdminPolicy.id ]);
    await this.createChatGroupPermission(chatGroupId, resource, "chat-group:traverse", []);
  }

  /**
   * Creates permissions for chat thread
   * 
   * @param chatThreadId chat thread id
   * @param resource resource
   */
  public async createChatThreadPermissions(chatThreadId: number, resource: ResourceRepresentation) {
    await this.createChatThreadPermission(chatThreadId, resource, "chat-thread:access", []);
  }

  /**
   * Creates chat group permission
   * 
   * @param chatThreadId chat group
   * @param resource resource
   * @param scope scope
   * @param policyIds policy ids
   */
  private createChatGroupPermission(chatGroupId: number, resource: ResourceRepresentation, scope: ApplicationScope, policyIds: string[]) {
    return userManagement.createScopePermission(this.getGroupPermissionName(chatGroupId, scope), [ resource.id || (resource as any)._id ], [ scope ], policyIds, DecisionStrategy.AFFIRMATIVE);
  }

  /**
   * Creates chat thread permission
   * 
   * @param chatThread chat thread
   * @param resource resource
   * @param scope scope
   * @param policyIds policy ids
   */
  private createChatThreadPermission(chatThreadId: number, resource: ResourceRepresentation, scope: ApplicationScope, policyIds: string[]) {
    return userManagement.createScopePermission(this.getThreadPermissionName(chatThreadId, scope), [ resource.id || (resource as any)._id ], [ scope ], policyIds, DecisionStrategy.AFFIRMATIVE);
  }

  /**
   * Adds a policy to chat group scope permission
   * 
   * @param chatThreadId chat group
   * @param scope scope
   * @param groupPolicy policy
   */
  private async addChatGroupPermissionPolicy(chatGroupId: number, scope: ApplicationScope, groupPolicy: GroupPolicyRepresentation) {
    const permission = await userManagement.findPermissionByName(this.getGroupPermissionName(chatGroupId, scope));
    if (!permission || !permission.id) {
      return;
    }

    const policyIds = await this.getChatGroupPermissionPolicyIds(chatGroupId, scope);
    permission.policies = policyIds.concat([groupPolicy.id!]);
    
    return await userManagement.updateScopePermission(permission.id, permission);
  }

  /**
   * Adds a policy to chat thread scope permission
   * 
   * @param chatThreadId chat thread
   * @param scope scope
   * @param groupPolicy policy
   */
  private async addChatThreadPermissionPolicy(chatThreadId: number, scope: ApplicationScope, policy: UserPolicyRepresentation | GroupPolicyRepresentation) {
    const permission = await userManagement.findPermissionByName(this.getThreadPermissionName(chatThreadId, scope));
    if (!permission || !permission.id) {
      throw new Error(`Failed to find permission ${this.getThreadPermissionName(chatThreadId, scope)}`);
    }

    const policyIds = await this.getChatThreadPermissionPolicyIds(chatThreadId, scope);
    permission.policies = policyIds.concat([policy.id!]);
    
    return await userManagement.updateScopePermission(permission.id, permission);
  }

  /**
   * Returns associated permission policy ids for chat group 
   * 
   * @param chatGroupId chat group
   * @param scope scope
   * @return associated permission policy ids
   */
  private async getChatGroupPermissionPolicyIds(chatGroupId: number, scope: ApplicationScope): Promise<string[]> {
    return this.getPermissionNamePolicyIds(this.getGroupPermissionName(chatGroupId, scope));
  }

  /**
   * Returns associated permission policy ids for chat thread 
   * 
   * @param chatThreadId chat thread
   * @param scope scope
   * @return associated permission policy ids
   */
  private async getChatThreadPermissionPolicyIds(chatThreadId: number, scope: ApplicationScope): Promise<string[]> {
    return this.getPermissionNamePolicyIds(this.getThreadPermissionName(chatThreadId, scope));
  }

  /**
   * Returns associated permission policy ids for given permission 
   * 
   * @param permissionName name of permission
   * @return associated permission policy ids
   */
  private async getPermissionNamePolicyIds(permissionName: string): Promise<string[]> {
    return this.getPermissionPolicyIds(await userManagement.findPermissionByName(permissionName));
  }
  
  /**
   * Returns associated permission policy ids for given permission 
   * 
   * @param permissionName name of permission
   * @return associated permission policy ids
   */
  private async getPermissionPolicyIds(permission: PolicyRepresentation | null): Promise<string[]> {
    if (!permission) {
      return [];
    }

    const policies = await userManagement.listAuthzPermissionAssociatedPolicies(permission.id!);
    
    return policies.map((policy) => {
      return policy.id!;
    });
  }

  /**
   * Finds or creates group policies for given group id
   * 
   * @param userGroupId user group id
   * @returns promise for group policy
   */
  private async resolveGroupPolicy(userGroupId: string): Promise<GroupPolicyRepresentation> {
    const policyName = `user-group-${userGroupId}`;
    const policy = await userManagement.findGroupPolicyByName(policyName);
    if (policy) {
      return policy;
    }

    return userManagement.createGroupPolicy(policyName, [ userGroupId ]);
  }

  /**
   * Finds or creates user policies for given user id
   * 
   * @param user user id
   * @returns promise for user policy
   */
  private async resolveUserPolicy(userId: string): Promise<UserPolicyRepresentation> {
    const policyName = `user-${userId}`;
    const policy = await userManagement.findUserPolicyByName(policyName);
    if (policy) {
      return policy;
    }

    return userManagement.createUserPolicy(policyName, [ userId ]);
  }

  /**
   * Returns chat group scope permission's name
   * 
   * @param chatGroup chat group
   * @param scope scope
   * @return chat group scope permission's name
   */
  private getGroupPermissionName(chatGroupId: number, scope: ApplicationScope) {
    return `${scope}-${chatGroupId}`;
  }

  /**
   * Returns chat thread scope permission's name
   * 
   * @param chatThread chat thread
   * @param scope scope
   * @return chat thread scope permission's name
   */
  private getThreadPermissionName(chatThreadId: number, scope: ApplicationScope) {
    return `${scope}-${chatThreadId}`;
  }
}

/**
 * Copies question groups into ChatGroups maintainig their ids
 * 
 * @param query query interface 
 */
const copyQuestionGroups = async (query: Sequelize.QueryInterface) => {
  return (await query.sequelize.query("INSERT INTO ChatGroups (id, type, title, imageUrl, archived, createdAt, updatedAt) SELECT id, 'QUESTION', title, imageUrl, archived, createdAt, updatedAt from QuestionGroups"));
};

/**
 * Returns thread user group roles from database
 * 
 * @param query query interface 
 */
const getChatThreadsByRole = async (query: Sequelize.QueryInterface, role: string): Promise<ThreadUserGroup[]> => {
  return (await query.sequelize.query(`SELECT threadId, userGroupId FROM ThreadUserGroupRoles WHERE role = '${role}'`))[0];
};

/**
 * Returns question user group roles from database
 * 
 * @param query query interface 
 */
const getQuestionGroupRoles = async (query: Sequelize.QueryInterface): Promise<QuestionGroupUserGroup[]> => {
  return (await query.sequelize.query("SELECT questionGroupId, userGroupId, role FROM QuestionGroupUserGroupRoles"))[0];
};

/**
 * Returns question user group thread users from database
 * 
 * @param query query interface 
 */
const getQuestionGroupThreadUsers = async (query: Sequelize.QueryInterface): Promise<QuestionGroupUser[]> => {
  return (await query.sequelize.query("SELECT questionGroupId, userId, threadId from QuestionGroupUserThreads"))[0];
};

/**
 * Creates new chat group into the database
 * 
 * @param query query interface 
 * @param type type
 * @param name name
 */
const insertChatGroup = async (query: Sequelize.QueryInterface, type: string, name: string) => {
  return (await query.sequelize.query(`INSERT INTO ChatGroups (type, title, createdAt, updatedAt) VALUES ('${type}', '${name}', NOW(), NOW())`))[0];
};

/**
 * Updates group id for a chat thread
 * 
 * @param query query interface 
 * @param threadId thread id
 * @param groupId group id
 */
const updateThreadGroupId = async (query: Sequelize.QueryInterface, threadId: number, groupId: string) => {
  return (await query.sequelize.query(`UPDATE Threads SET groupId = ${groupId} WHERE id = ${threadId}`));
};

/**
 * Returns thread's title
 * 
 * @param query query
 * @param threadId thread id
 * @returns thread's title
 */
const getThreadTitle = async (query: Sequelize.QueryInterface, threadId: number): Promise<string> => {
  return (await query.sequelize.query(`SELECT title FROM Threads WHERE id = ${threadId}`))[0];
};

/**
 * Finds or creates new group resource into the Keycloak
 * 
 * @param id group id 
 */
const createGroupResource = async (id: number): Promise<ResourceRepresentation> => {
  const name = `chat-group-${id}`;
  const uri = `/rest/v1/chatGroups/${id}`;
  
  let resource = await userManagement.findResourceByUri(uri);        
  if (!resource) {
    resource = await userManagement.createResource(name, name, uri, "chat-group", GROUP_SCOPES);
  } 

  return resource!;
};

/**
 * Finds or creates new thread resource into the Keycloak
 * 
 * @param id thread id 
 */
const createThreadResource = async (id: number) => {
  const name = `chat-thread-${id}`;
  const uri = `/rest/v1/chatThreads/${id}`;
  
  let resource = await userManagement.findResourceByUri(uri);        
  if (!resource) {
    resource = await userManagement.createResource(name, name, uri, "chat-thread", THREAD_SCOPES);
  } 

  return resource;
};

const migrateQuestionGroups = async (query: Sequelize.QueryInterface) => {
  const permissionController = new PermissionController();

  // Copy existing question groups into newly created table
        
  copyQuestionGroups(query);

  // Add question group roles (manage for managers, traverse for users)

  const questionGroupRoles = await getQuestionGroupRoles(query);

  // Add permissions

  const questionGroupIds = _.uniq(questionGroupRoles.map((questionGroup) => {
    return questionGroup.questionGroupId;
  }));

  for (let i = 0; i < questionGroupIds.length; i++) {
    logger.info(`Migrating chat group ${i + 1} / ${questionGroupIds.length}`);
    const chatGroupId = questionGroupIds[i];
    const resource = await createGroupResource(chatGroupId);
    await permissionController.createChatGroupPermissions(questionGroupIds[i], resource);
  }

  for (let i = 0; i < questionGroupRoles.length; i++) {
    logger.info(`Migrating chat group roles ${i + 1} / ${questionGroupRoles.length}`);
    const questionGroupRole = questionGroupRoles[i];
    const chatGroupId = questionGroupRole.questionGroupId;
    const groupScope: ApplicationScope = questionGroupRole.role == "manager" ? "chat-group:manage" : "chat-group:traverse";
    const userGroup: GroupRepresentation = await userManagement.findGroup(questionGroupRole.userGroupId);
    await permissionController.setUserGroupChatGroupScope(chatGroupId, userGroup, groupScope);
  }

  // Add thread access permission to question group thread users

  const questionGroupUsers = await getQuestionGroupThreadUsers(query);

  const threadIds = _.uniq(questionGroupUsers.map((questionGroupUser) => {
    return questionGroupUser.threadId;
  }));

  for (let j = 0; j < threadIds.length; j++) {
    logger.info(`Migrating chat threads ${j + 1} / ${threadIds.length}`);

    const threadId = threadIds[j];
    const resource = await createThreadResource(threadId);
    await permissionController.createChatThreadPermissions(threadId, resource!);
  }

  for (let j = 0; j < questionGroupUsers.length; j++) {
    logger.info(`Migrating chat user ${j + 1} / ${questionGroupUsers.length}`);

    const userId = questionGroupUsers[j].userId;
    const chatThreadId = questionGroupUsers[j].threadId;
    const user = await userManagement.findUser(userId);
    
    if (user) {
      await permissionController.setUserChatThreadScope(chatThreadId, user, "chat-thread:access");
    }
  }

};

const migrateRoleChatGroups = async (query: Sequelize.QueryInterface, role: string, threadGroupds: { [ key: number] : number }) => {
  const permissionController = new PermissionController();
  const chatThreadRoles = await getChatThreadsByRole(query, role);

  for (let i = 0; i < chatThreadRoles.length; i++) {
    const chatThreadRole = chatThreadRoles[i];
    const threadId = chatThreadRole.threadId;
    const userGroupId = chatThreadRole.userGroupId;

    logger.info(`Migrate chat group for thread #${threadId} ${i + 1} / ${chatThreadRoles.length}`);

    if (!threadGroupds[threadId]) {
      logger.info("No group, creating");

      const threadTitle = await getThreadTitle(query, threadId);
      const chatGroupId = await insertChatGroup(query, "chat", threadTitle);

      console.log("Created group ", chatGroupId);

      await updateThreadGroupId(query, threadId, chatGroupId);
      const resource = await createThreadResource(threadId);  
      await permissionController.createChatThreadPermissions(threadId, resource!);
      threadGroupds[threadId] = chatGroupId;
    } else {
      logger.info("Groupi group!");      
    }

    const userGroup = await userManagement.findGroup(userGroupId);
    const scope: ApplicationScope = role == "manager" ? "chat-group:manage" : "chat-group:access";
    await permissionController.setUserGroupChatGroupScope(threadGroupds[threadId], userGroup, scope);
  }
  
};

const migrateChatGroups = async (query: Sequelize.QueryInterface) => {
  const threadGroupds: { [ key: number] : number } = {};
  // Create group for chat threads
  await migrateRoleChatGroups(query, "manager", threadGroupds);
  await migrateRoleChatGroups(query, "user", threadGroupds);
};

const createChatAdminRole = async () => {
  let role = await userManagement.findRealmRole("create-chat-groups");
  if (!role) {
    role = await userManagement.createRealmRole("create-chat-groups");
  }

  const existing = await userManagement.findRolePolicyByName("chat-admin");
  if (!existing) {
    await userManagement.createRolePolicy("chat-admin", [ role!.id! ]);
  }
}

module.exports = {

  up: async (query: Sequelize.QueryInterface) => {
    // Chat admin role

    await createChatAdminRole();

    // Create new chat groups table 

    await query.createTable("ChatGroups", {
      id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
      type: { type: Sequelize.STRING(191), allowNull: false },
      title: { type: Sequelize.STRING(191), allowNull: false },
      imageUrl: { type: Sequelize.STRING(191) },      
      archived: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false},
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }        
    });

    // Add groupId and remove originId columns from Threads table

    await query.addColumn("Threads", "groupId", { type: Sequelize.BIGINT, allowNull: true });
    await query.addColumn("Threads", "ownerId", { type: Sequelize.STRING(191), allowNull: true });
    await query.removeColumn("Threads", "originId");

    // Migrate question groups 

    await migrateQuestionGroups(query);

    logger.info("QuestionGroups migrated");

    // Migrate chat groups

    await migrateChatGroups(query);

    logger.info("ChatGroups migrated");

    // Clean the database

    await query.dropTable("ThreadUserGroupRoles");
    await query.dropTable("QuestionGroupUserGroupRoles");
    await query.dropTable("QuestionGroupUserThreads");
    
    await query.changeColumn("Threads", "groupId", { type: Sequelize.BIGINT, allowNull: false, references: { model: "ChatGroups", key: "id" } }); 
  }
};