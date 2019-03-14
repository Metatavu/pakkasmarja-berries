(() => {
  "use strict";

  const userManagement = require(__dirname + "/../../user-management").default;
  const GROUP_SCOPES = ["chat-group:access", "chat-group:manage", "chat-group:traverse"];
  const THREAD_SCOPES = ["chat-thread:access"];

  /**
   * Lists all user groups from Keycloak
   * 
   * @returns promise for user group map
   */
  const getUserGroupNames = async () => {
    const userGroupNames = {};
    const userGroups = await userManagement.listGroups();

    userGroups.forEach((userGroup) => {
      userGroupNames[userGroup.id] = userGroup.name;
    });

    return userGroupNames;
  };

  /**
   * Finds or creates group policies for given group ids
   * 
   * @param groupIds group ids
   * @returns promise for group policies
   */
  const getGroupPolicies = async (groupIds) => {
    return await Promise.all(groupIds.map(async (groupId) => {
      const policyName = `user-group-${groupId}`;
      const policy = await userManagement.findGroupPolicyByName(policyName);
      if (policy) {
        return policy;
      }

      return userManagement.createGroupPolicy(policyName, [groupId]);
    }));
  };

  /**
   * Finds or creates user policy for given user id
   * 
   * @param userId userId
   * @returns promise for user policy
   */
  const getUserPolicy = async (userId) => {
    const policyName = `user-${userId}`;

    const policy = await userManagement.findUserPolicyByName(policyName);
    if (policy) {
      return policy;
    }

    return userManagement.createUserPolicy(policyName, [userId]);
  };

  /**
   * Finds or creates group permission
   * 
   * @param chatGroupId chat group id
   * @param userGroupId user group id
   * @param resourceId, resource id
   * @param role role
   * @param policyId policy id
   * @returns promise for group permission
   */
  const createChatGroupGroupPermission = async (chatGroupId, userGroupId, resourceId, role, policyId) => {
    const name = `chat-group-${chatGroupId}-user-group-${userGroupId}`;
    const permission = await userManagement.findPermissionByName(name);
    if (permission) {
      return permission;
    }

    return await userManagement.createScopePermission(name, [ resourceId ], [role], [policyId]);
  };

  /**
   * Finds or creates user permission
   * 
   * @param chatThreadId chat thread id
   * @param userId user id
   * @param resourceId, resource id
   * @param role role
   * @param policyId policy id
   * @returns promise for group permission
   */
  const createChatThreadUserPermission = async (chatThreadId, userId, resourceId, role, policyId) => {
    const name = `chat-thread-${chatThreadId}-user-${userId}`;
    const permission = await userManagement.findPermissionByName(name);
    if (permission) {
      return permission;
    }

    return await userManagement.createScopePermission(name, [ resourceId ], [role], [policyId]);
  };

  /**
   * Copies question groups into ChatGroups maintainig their ids
   * 
   * @param query query interface 
   */
  const copyQuestionGroups = async (query) => {
    return (await query.sequelize.query("INSERT INTO ChatGroups (id, type, title, imageUrl, archived, createdAt, updatedAt) SELECT id, 'QUESTION', title, imageUrl, archived, createdAt, updatedAt from QuestionGroups"));
  };

  /**
   * Returns thread user group roles from database
   * 
   * @param query query interface 
   */
  const getChatThreadsByRole = async (query, role) => {
    return (await query.sequelize.query(`SELECT threadId, userGroupId FROM ThreadUserGroupRoles WHERE role = '${role}'`))[0];
  };

  /**
   * Returns question user group roles from database
   * 
   * @param query query interface 
   */
  const getQuestionGroupRoles = async (query) => {
    return (await query.sequelize.query("SELECT questionGroupId, userGroupId, role FROM QuestionGroupUserGroupRoles"))[0];
  };

  /**
   * Returns question user group thread users from database
   * 
   * @param query query interface 
   */
  const getQuestionGroupThreadUsers = async (query) => {
    return (await query.sequelize.query("SELECT questionGroupId, userId, threadId from QuestionGroupUserThreads"))[0];
  };

  /**
   * Returns question group threads from database
   * 
   * @param query query interface 
   * @param questionGroupId question group id
   */
  const getQuestionGroupThreads = async (query, questionGroupId) => {
    return (await query.sequelize.query(`SELECT threadId FROM QuestionGroupUserThreads WHERE questionGroupId = ${questionGroupId}`))[0].map((row) => {
      return row.threadId;
    });
  };

  /**
   * Creates new chat group into the database
   * 
   * @param query query interface 
   * @param type type
   * @param name name
   */
  const insertChatGroup = async (query, type, name) => {
    return (await query.sequelize.query(`INSERT INTO ChatGroups (type, title, createdAt, updatedAt) VALUES ('${type}', '${name}', NOW(), NOW())`))[0];
  };

  /**
   * Updates group id for a chat thread
   * 
   * @param query query interface 
   * @param threadId thread id
   * @param groupId group id
   */
  const updateThreadGroupId = async (query, threadId, groupId) => {
    return (await query.sequelize.query(`UPDATE Threads SET groupId = ${groupId} WHERE id = ${threadId}`));
  };

  /**
   * Finds or creates new group resource into the Keycloak
   * 
   * @param id group id 
   */
  const createGroupResource = async (id) => {
    const name = `chat-group-${id}`;
    const uri = `/rest/v1/chatGroups/${id}`;
    
    let resource = await userManagement.findResourceByUri(uri);        
    if (!resource) {
      resource = await userManagement.createResource(name, name, uri, "chat-group", GROUP_SCOPES);
    } 

    return resource;
  };

  /**
   * Finds or creates new thread resource into the Keycloak
   * 
   * @param id thread id 
   */
  const createThreadResource = async (id) => {
    const name = `chat-thread-${id}`;
    const uri = `/rest/v1/chatThreads/${id}`;
    
    let resource = await userManagement.findResourceByUri(uri);        
    if (!resource) {
      resource = await userManagement.createResource(name, name, uri, "chat-thread", THREAD_SCOPES);
    } 

    return resource;
  };

  const migrateQuestionGroups = async (query, groupPolicyIds) => {
    // Copy existing question groups into newly created table
          
    copyQuestionGroups(query);

    // Add question group roles (manage for managers, traverse for users)

    const questionGroupRoles = await getQuestionGroupRoles(query);

    for (let i = 0; i < questionGroupRoles.length; i++) {
      const questionGroupRole = questionGroupRoles[i];
      const chatGroupId = questionGroupRole.questionGroupId;
      const questionGroupThreads = await getQuestionGroupThreads(query, chatGroupId);
      const resource = await createGroupResource(chatGroupId);
      const policyId = groupPolicyIds[`user-group-${questionGroupRole.userGroupId}`];

      await createChatGroupGroupPermission(chatGroupId, questionGroupRole.userGroupId, resource._id, questionGroupRole.role == "manager" ? "chat-group:manage" : "chat-group:traverse", policyId);

      for (let j = 0; j < questionGroupThreads.length; j++) {
        await updateThreadGroupId(query, questionGroupThreads[j], chatGroupId);
      }
    }

    // Add thread access permission to question group thread users

    const questionGroupUsers = await getQuestionGroupThreadUsers(query);

    for (let i = 0; i < questionGroupUsers.length; i++) {
      const userId = questionGroupUsers[i].userId;
      const chatThreadId = questionGroupUsers[i].threadId;
      const user = await userManagement.findUser(userId);
      
      if (user) {
        const policy = await getUserPolicy(userId);
        const resource = await createThreadResource(chatThreadId);
        await createChatThreadUserPermission(chatThreadId, userId, resource.id || resource._id, "chat-thread:access", policy.id);
      }
    }
  };

  const migrateRoleChatGroups = async (query, groupPolicyIds, userGroupNames, role) => {
    const chatThreadRoles = await getChatThreadsByRole(query, role);

    for (let i = 0; i < chatThreadRoles.length; i++) {
      const chatThreadRole = chatThreadRoles[i];
      const groupName = userGroupNames[chatThreadRole.userGroupId];
      const chatGroupId = await insertChatGroup(query, "CHAT", groupName);
      const policyId = groupPolicyIds[`user-group-${chatThreadRole.userGroupId}`];
      updateThreadGroupId(query, chatThreadRole.threadId, chatGroupId);
      const resource = await createGroupResource(chatGroupId);
      await createChatGroupGroupPermission(chatGroupId, chatThreadRole.userGroupId, resource._id, role == "manager" ? "chat-group:manage" : "chat-group:access", policyId);
    }
  };

  const migrateChatGroups = async (query, groupPolicyIds, userGroupNames) => {
    // Create group for chat threads
    await migrateRoleChatGroups(query, groupPolicyIds, userGroupNames, "manager");
    await migrateRoleChatGroups(query, groupPolicyIds, userGroupNames, "user");
  };
  
  module.exports = {

    up: async (query, Sequelize) => {
      // Create group policies

      const userGroupNames = await getUserGroupNames();
      const groupPolicies = await getGroupPolicies(Object.keys(userGroupNames));
      const groupPolicyIds = {};
      groupPolicies.forEach((groupPolicy) => {
        groupPolicyIds[groupPolicy.name] = groupPolicy.id;
      });

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
      await query.removeColumn("Threads", "originId");

      console.log("Migrating question groups...");

      // Migrate question groups 

      await migrateQuestionGroups(query, groupPolicyIds);

      console.log("Migrating chat groups...");

      // Migrate chat groups

      await migrateChatGroups(query, groupPolicyIds, userGroupNames);

      // Clean the database

      await query.dropTable("ThreadUserGroupRoles");
      await query.dropTable("QuestionGroupUserGroupRoles");
      await query.dropTable("QuestionGroupUserThreads");
      await query.changeColumn("Threads", "groupId", { type: Sequelize.BIGINT, allowNull: false, references: { model: "ChatGroups", key: "id" } }); 
    }
  };

})();