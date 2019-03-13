(() => {
  "use strict";
  
  const userManagement = require(__dirname + "/../../user-management").default;

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
   * Finds or creates group permission
   * 
   * @param chatGroupId chat group id
   * @param userGroupId user group id
   * @param resourceId, resource id
   * @param role role
   * @param policyId policy id
   * @returns promise for group permission
   */
  const createGroupPermission = async (chatGroupId, userGroupId, resourceId, role, policyId) => {
    const name = `chat-group-${chatGroupId}-user-group-${userGroupId}-${role}`;
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
  const getChatThreadRoles = async (query) => {
    return (await query.sequelize.query("SELECT threadId, userGroupId, role FROM ThreadUserGroupRoles"))[0];
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
      resource = await userManagement.createResource(name, name, uri, "chat-group", ["manage", "access"]);
    } 

    return resource;
  };
  
  module.exports = {

    up: async (query, Sequelize) => {
      await query.createTable("ChatGroups", {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        type: { type: Sequelize.STRING(191), allowNull: false },
        title: { type: Sequelize.STRING(191), allowNull: false },
        imageUrl: { type: Sequelize.STRING(191) },      
        archived: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false},
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false }        
      });

      await query.addColumn("Threads", "groupId", { type: Sequelize.BIGINT, allowNull: true });
      await query.removeColumn("Threads", "originId");

      copyQuestionGroups(query);

      const userGroupNames = await getUserGroupNames();
      const groupPolicies = await getGroupPolicies(Object.keys(userGroupNames));
      const groupPolicyIds = {};

      groupPolicies.forEach((groupPolicy) => {
        groupPolicyIds[groupPolicy.name] = groupPolicy.id;
      });

      const chatThreadRoles = await getChatThreadRoles(query);
      const questionGroupRoles = await getQuestionGroupRoles(query);
      const chatGroupIds = {};

      for (let i = 0; i < chatThreadRoles.length; i++) {
        const chatThreadRole = chatThreadRoles[i];
        
        if (!chatGroupIds[chatThreadRole.userGroupId]) {
          const groupName = userGroupNames[chatThreadRole.userGroupId];
          chatGroupIds[chatThreadRole.userGroupId] = await insertChatGroup(query, "CHAT", groupName);
        }

        const policyId = groupPolicyIds[`user-group-${chatThreadRole.userGroupId}`];
        const chatGroupId = chatGroupIds[chatThreadRole.userGroupId];
        updateThreadGroupId(query, chatThreadRole.threadId, chatGroupId);
        const resource = await createGroupResource(chatGroupId);

        await createGroupPermission(chatGroupId, chatThreadRole.userGroupId, resource._id, chatThreadRole.role == "manager" ? "manage" : "access", policyId);
      }

      for (let i = 0; i < questionGroupRoles.length; i++) {
        const questionGroupRole = questionGroupRoles[i];
        const chatGroupId = questionGroupRole.questionGroupId;
        const questionGroupThreads = await getQuestionGroupThreads(query, chatGroupId);
        const resource = await createGroupResource(chatGroupId);
        const policyId = groupPolicyIds[`user-group-${questionGroupRole.userGroupId}`];

        await createGroupPermission(chatGroupId, questionGroupRole.userGroupId, resource._id, questionGroupRole.role == "manager" ? "manage" : "access", policyId);

        for (let j = 0; j < questionGroupThreads.length; j++) {
          await updateThreadGroupId(query, questionGroupThreads[j], chatGroupId);
        }
      }

      query.dropTable("ThreadUserGroupRoles");
      query.dropTable("QuestionGroupUserGroupRoles");
      query.dropTable("questiongroupuserthread");
      await query.changeColumn("Threads", "groupId", { type: Sequelize.BIGINT, allowNull: false, references: { model: "ChatGroups", key: "id" } }); 
    }
  };

})();