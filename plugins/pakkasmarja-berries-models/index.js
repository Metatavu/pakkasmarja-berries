/* jshint esversion: 6 */
/* global __dirname, Promise */
(() => {
  "use strict";
  
  const fs = require("fs");
  const _ = require("lodash");
  const Promise = require("bluebird");
  const Umzug = require("umzug");
  const config = require("nconf");

  class Models {
    
    constructor (logger, shadySequelize) {
      this.logger = logger;
      this.sequelize = shadySequelize.sequelize;
      this.Sequelize = shadySequelize.Sequelize;
    }
    
    /**
     * Defines database models
     */
    defineModels() {
      const Sequelize = this.Sequelize;
      
      this.defineModel("Session", {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false, defaultValue: Sequelize.UUIDV4 },
        userId: { type: Sequelize.STRING(191), allowNull: false, validate: { isUUID: 4 } }
      });
      
      this.defineModel("ConnectSession", {
        sid: {
          type: Sequelize.STRING(191),
          primaryKey: true
        },
        userId: Sequelize.STRING(191),
        expires: Sequelize.DATE,
        data: Sequelize.TEXT
      });
      
      this.defineModel("UserSettings", {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        userId: { type: Sequelize.STRING(191), allowNull: false, validate: { isUUID: 4 } },
        settingKey: { type: Sequelize.STRING(191), allowNull: false },
        settingValue: { type: Sequelize.STRING(191) }
      }, {
        indexes: [{
          name: "UN_USERSETTING_USERID_SETTINGKEY",
          unique: true,
          fields: ["userId", "settingKey"]
        }]
      });
      
      this.defineModel("Thread", {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        title: { type: Sequelize.STRING(191) },
        description: { type: "LONGTEXT" },
        type: { type: Sequelize.STRING(191), allowNull: false },
        originId: { type: Sequelize.STRING(191) },
        imageUrl: { type: Sequelize.STRING(191), validate: { isUrl: true } },
        archived: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false},
        answerType: { type: Sequelize.STRING(191), allowNull: false, defaultValue: "TEXT" }
      }, {
        hooks: {
          "afterFind": (object) => {
            if (!object) {
              return;  
            }
            
            const threads = _.isArray(object) ? object : [ object ];
            
            const extendPromises = _.map(threads, (thread) => {
              return this.createThreadLatestMessagePromise(thread);
            });
            
            return Promise.all(extendPromises);
          }
        }
      });

      this.defineModel("ThreadPredefinedText", {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        threadId: { type: Sequelize.BIGINT, allowNull: false, references: { model: this.Thread, key: "id" } },
        text: { type: Sequelize.STRING(191), allowNull: false }
      });
      
      this.defineModel("ThreadUserGroupRole", {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        threadId: { type: Sequelize.BIGINT, allowNull: false, references: { model: this.Thread, key: "id" } },
        userGroupId: { type: Sequelize.STRING(191), allowNull: false, validate: { isUUID: 4 }  },
        role: { type: Sequelize.STRING(191), allowNull: false  }
      }, {
        indexes: [{
          name: "UN_THREADUSERGROUPROLE_THREADID_USERGROUPID",
          unique: true,
          fields: ["threadId", "userGroupId"]
        }]
      });
      
      this.defineModel("Message", {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        threadId: { type: Sequelize.BIGINT, allowNull: false, references: { model: this.Thread, key: "id" } },
        userId: { type: Sequelize.STRING(191), allowNull: false, validate: { isUUID: 4 } },
        contents: { type: Sequelize.TEXT, allowNull: false }
      });
      
      this.defineModel("QuestionGroup", {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        title: { type: Sequelize.STRING(191), allowNull: false },
        originId: { type: Sequelize.STRING(191), allowNull: false },
        imageUrl: { type: Sequelize.STRING(191), validate: { isUrl: true } },
        archived: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false}
      });
      
      this.defineModel("QuestionGroupUserGroupRole", {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        questionGroupId: { type: Sequelize.BIGINT, allowNull: false, references: { model: this.QuestionGroup, key: "id" } },
        userGroupId: { type: Sequelize.STRING(191), allowNull: false, validate: { isUUID: 4 }  },
        role: { type: Sequelize.STRING(191), allowNull: false  }
      }, {
        indexes: [{
          name: "UN_QUESTIONGROUPUSERGROUPROLE_QUESTIONGROUPID_USERGROUPID",
          unique: true,
          fields: ["questionGroupId", "userGroupId"]
        }]
      });
      
      this.defineModel("QuestionGroupUserThread", {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        questionGroupId: { type: Sequelize.BIGINT, allowNull: false, references: { model: this.QuestionGroup, key: "id" } },
        threadId: { type: Sequelize.BIGINT, allowNull: false, references: { model: this.Thread, key: "id" } },
        userId: { type: Sequelize.STRING(191), allowNull: false, validate: { isUUID: 4 } }
      }, {
        indexes: [{
          name: "UN_QUESTIONGROUPUSERTHREAD_QUESTIONGROUPID_THREADID",
          unique: true,
          fields: ["questionGroupId", "threadId"]
        }]
      });
      
      this.defineModel("NewsArticle", {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        title: { type: Sequelize.STRING(191), allowNull: false },
        contents: { type: "LONGTEXT", allowNull: false },
        originId: { type: Sequelize.STRING(191), allowNull: false },
        imageUrl: { type: Sequelize.STRING(191), validate: { isUrl: true } }
      });
      
      this.defineModel("MessageAttachment", {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        messageId: { type: Sequelize.BIGINT, allowNull: false, references: { model: this.Message, key: "id" } },
        contents: { type: "LONGBLOB", allowNull: false },
        contentType: { type: Sequelize.STRING(191), allowNull: false },
        fileName: { type: Sequelize.STRING(191) },
        size: { type: Sequelize.BIGINT }
      });
      
      this.defineModel("ItemRead", {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        userId: { type: Sequelize.STRING(191), allowNull: false, validate: { isUUID: 4 } },
        itemId: { type: Sequelize.STRING(191), allowNull: false }
      }, {
        indexes: [{
          name: "UN_ITEMREAD_USERID_ITEMID",
          unique: true,
          fields: ["userId", "itemId"]
        }]
      });
      
      this.defineModel("ItemGroup", {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        sapId: { type: Sequelize.STRING(191), allowNull: false },
        externalId: { type: Sequelize.UUID, allowNull: false, validate: { isUUID: 4 }, defaultValue: Sequelize.UUIDV4 },
        name: { type: Sequelize.STRING(191), allowNull: false },
        category: { type: Sequelize.STRING(191), allowNull: false },
        displayName: { type: Sequelize.STRING(191), allowNull: true },
        minimumProfitEstimation: { type: Sequelize.DOUBLE, allowNull: false, defaultValue: 0 },
        prerequisiteContractItemGroupId: { type: Sequelize.BIGINT, allowNull: true, references: { model: this.ItemGroup, key: "id" } }
      }, {
        indexes: [{
          name: "UN_ITEMGROUP_SAP_ID",
          unique: true,
          fields: ["sapId"]
        }, {
          name: "UN_ITEMGROUP_EXTERNAL_ID",
          unique: true,
          fields: ["externalId"]
        }]
      });

      this.defineModel("ItemGroupPrice", {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        externalId: { type: Sequelize.UUID, unique: true, validate: { isUUID: 4 }, defaultValue: Sequelize.UUIDV4 },
        groupName: { type: Sequelize.STRING(191), allowNull: false },
        unit: { type: Sequelize.STRING(191), allowNull: false },
        price: { type: Sequelize.STRING(191), allowNull: false },
        year: { type: Sequelize.INTEGER, allowNull: false },
        itemGroupId: { type: Sequelize.BIGINT, allowNull: false, references: { model: this.ItemGroup, key: "id" } }
      });

      this.defineModel("DeliveryPlace", {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        sapId: { type: Sequelize.STRING(191), allowNull: false },
        externalId: { type: Sequelize.UUID, allowNull: false, validate: { isUUID: 4 }, defaultValue: Sequelize.UUIDV4 },
        name: { type: Sequelize.STRING(191), allowNull: false }
      }, {
        indexes: [{
          name: "UN_DELIVERY_PLACE_SAP_ID",
          unique: true,
          fields: ["sapId"]
        }, {
          name: "UN_DELIVERY_PLACE_EXTERNAL_ID",
          unique: true,
          fields: ["externalId"]
        }]
      });
      
      this.defineModel("Contract", {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        externalId: { type: Sequelize.UUID, validate: { isUUID: 4 }, defaultValue: Sequelize.UUIDV4 },
        userId: { type: Sequelize.STRING(191), allowNull: false, validate: { isUUID: 4 } },
        itemGroupId: { type: Sequelize.BIGINT, allowNull: false, references: { model: this.ItemGroup, key: "id" } },
        deliveryPlaceId: { type: Sequelize.BIGINT, allowNull: false, references: { model: this.DeliveryPlace, key: "id" } },
        proposedDeliveryPlaceId: { type: Sequelize.BIGINT, allowNull: false, references: { model: this.DeliveryPlace, key: "id" } },
        sapId: { type: Sequelize.STRING(191), allowNull: true },
        contractQuantity: { type: Sequelize.BIGINT },
        deliveredQuantity: { type: Sequelize.BIGINT },
        proposedQuantity: { type: Sequelize.BIGINT },
        year: { type: Sequelize.INTEGER, allowNull: false },
        startDate: Sequelize.DATE,
        endDate: Sequelize.DATE,
        signDate: Sequelize.DATE,
        termDate: Sequelize.DATE,
        status: { type: Sequelize.STRING(191), allowNull: false },
        areaDetails: "LONGTEXT",
        deliverAll: { type: Sequelize.BOOLEAN, allowNull: false },
        remarks: Sequelize.TEXT,
        deliveryPlaceComment: Sequelize.TEXT,
        quantityComment: Sequelize.TEXT,
        rejectComment: Sequelize.TEXT
      }, {
        indexes: [{
          name: "UN_CONTRACT_EXTERNAL_ID",
          unique: true,
          fields: ["externalId"]
        }, {
          name: "UN_CONTRACT_SAP_ID",
          unique: true,
          fields: ["sapId"]
        }]
      });
      
      this.defineModel("DocumentTemplate", {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        contents: { type: "LONGTEXT", allowNull: false },
        header: { type: "LONGTEXT", allowNull: true },
        footer: { type: "LONGTEXT", allowNull: true }
      });

      this.defineModel("ItemGroupDocumentTemplate", {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        externalId: { type: Sequelize.UUID, validate: { isUUID: 4 }, defaultValue: Sequelize.UUIDV4 },
        type: { type: Sequelize.STRING(191), allowNull: false },
        itemGroupId: { type: Sequelize.BIGINT, allowNull: false, references: { model: this.ItemGroup, key: "id" } },
        documentTemplateId: { type: Sequelize.BIGINT, allowNull: false, references: { model: this.DocumentTemplate, key: "id" } }
      }, {
        indexes: [{
          name: "UN_ITEM_GROUP_TEMPLATE_EXTERNAL_ID",
          unique: true,
          fields: ["externalId"]
        }, {
          name: "UN_ITEM_GROUP_TEMPLATE_ITEM_GROUP_ID_TYPE",
          unique: true,
          fields: ["type", "itemGroupId"]
        }]
      });
      
      this.defineModel("ContractDocumentTemplate", {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        externalId: { type: Sequelize.UUID, validate: { isUUID: 4 }, defaultValue: Sequelize.UUIDV4 },
        type: { type: Sequelize.STRING(191), allowNull: false },
        contractId: { type: Sequelize.BIGINT, allowNull: false, references: { model: this.Contract, key: "id" } },
        documentTemplateId: { type: Sequelize.BIGINT, allowNull: false, references: { model: this.DocumentTemplate, key: "id" } }
      }, {
        indexes: [{
          name: "UN_CONTRACT_DOCUMENT_TEMPLATE_EXTERNAL_ID",
          unique: true,
          fields: ["externalId"]
        }, {
          name: "UN_CONTRACT_DOCUMENT_TEMPLATE_CONTRACT_ID_TYPE",
          unique: true,
          fields: ["type", "contractId"]
        }]
      });

      this.defineModel("ContractDocument", {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        type: { type: Sequelize.STRING(191), allowNull: false },
        contractId: { type: Sequelize.BIGINT, allowNull: false, references: { model: this.Contract, key: "id" } },
        vismaSignDocumentId: { type: Sequelize.STRING(191), allowNull: false },
        signed: { type: Sequelize.BOOLEAN, allowNull: false }
      }, {
        indexes: [{
          name: "UN_CONTRACT_DOCUMENT_CONTRACT_ID_TYPE",
          unique: true,
          fields: ["type", "contractId"]
        }]
      });
      
      this.defineModel("OperationReport", {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        externalId: { type: Sequelize.UUID, unique: true, validate: { isUUID: 4 }, defaultValue: Sequelize.UUIDV4 },
        type: { type: Sequelize.STRING(191), allowNull: false }
      });
      
      this.defineModel("OperationReportItem", {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        message: { type: "LONGBLOB", allowNull: true },
        operationReportId: { type: Sequelize.BIGINT, allowNull: false, references: { model: this.OperationReport, key: "id" } },
        completed: { type: Sequelize.BOOLEAN, allowNull: false },
        success: { type: Sequelize.BOOLEAN, allowNull: false }
      });
    }

    /**
     * Runs all pending database migrations 
     * 
     * @return {Promise} Promise for migrations 
     */
    migrationsUp () {   
      return this.obtainMigrationLock()
        .then((locked) => {
          if (locked) {
            const umzug = new Umzug({
              storage: "sequelize",
              storageOptions: {
                sequelize: this.sequelize
              },
              migrations: {
                params: [
                  this.sequelize.getQueryInterface(),
                  this.Sequelize
                ],
                path: `${__dirname}/migrations/`
              }
            });
      
            return umzug.up().then((migrations) => {
              return this.releaseMigrationLock().then(() => {
                return migrations;
              });
            });
          } else {
            return this.waitMigrationLock()
              .then(() => {
                return [];
              });
          }
        });
    }

    /**
     * Obtains migration lock. Lock can be created by this worker or the lock can already be present. 
     * 
     * @return {Promise} Promise that resolves with whether lock was created by this worker
     */
    obtainMigrationLock() {
      const lockFile = config.get("migrations:lock-file");

      return new Promise((resolve, reject) => {
        fs.open(lockFile, "wx", (err) => {
          if (err) {
            if (err.code === "EEXIST") {
              resolve(false);
            } else {
              reject(err);
            }
          } else {
            resolve(true);
          }
        });
      });
    }

    /**
     * Releases migration lock
     * 
     * @return {Promise} Promise for removed lock file 
     */
    releaseMigrationLock() {
      const lockFile = config.get("migrations:lock-file");

      return new Promise((resolve, reject) => {
        fs.unlink(lockFile, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve(true);
          }
        });
      });
    }

    /**
     * Waits migration lock
     * 
     * @return {Promise} Promise for released lock 
     */
    waitMigrationLock() {
      const lockFile = config.get("migrations:lock-file");

      return new Promise((resolve, reject) => {
        fs.exists(lockFile, (exists) => {
          if (exists) {
            setTimeout(() => {
              this.waitMigrationLock()
                .then(() => {
                  resolve();
                })
                .catch(() => {
                  reject();
                });
            }, 300);
          } else {
            resolve();
          }
        });
      }); 
    }

    /**
     * Defines new database model.
     * 
     * @param {String} name model name
     * @param {Object} attributes model attributes
     * @param {Object} options model options
     */
    defineModel(name, attributes, options) {
      this[name] = this.sequelize.define(name, attributes, Object.assign(options || {}, {
        charset: "utf8mb4",
        dialectOptions: {
          collate: "utf8mb4_unicode_ci"
        }
      }));
    }
    
    // User settings
    
    upsertUserSetting(userId, settingKey, settingValue) {
      return this.UserSettings.upsert({
        userId: userId,
        settingKey: settingKey,
        settingValue: settingValue
      });
    }
    
    getUserSettings(userId) {
      return this.UserSettings.findAll({ where: { userId: userId } });
    }

    findUserSettingsByUserIdAndKey(userId, settingKey) {
      return this.UserSettings.findOne({ where: { userId: userId, settingKey: settingKey } });
    }
    // Sessions
    
    findSession(id) {
      return this.Session.findOne({ where: { id : id } });
    }
    
    createSession(userId) {
      return this.Session.create({
        userId: userId
      });
    }
    
    deleteSession(id) {
      return this.Session.destroy({ where: { id : id } });
    }
    
    // Threads
    
    archiveThread(id) {
      return this.Thread.update({ archived: true }, { where: { id: id } });
    }
    
    /**
     * Creates new thread
     * 
     * @param {String} originId id in origin system
     * @param {String} title title
     * @param {String} description description
     * @param {String} type type
     * @param {String} imageUrl image url
     * @param {String} answerType answerType
     */
    createThread(originId, title, description, type, imageUrl, answerType) {
      return this.Thread.create({
        originId: originId,
        title: title,
        description: description,
        type: type,
        imageUrl: imageUrl,
        answerType: answerType
      });
    }
    
    findThread(id) {
      return this.Thread.findOne({ where: { id : id } });
    }
    
    findThreads(ids) {
      return this.Thread.findAll({ where: { id : { $in: ids } }});
    }
    
    findThreadByOriginId(originId) {
      return this.Thread.findOne({ where: { originId : originId } });
    }
    
    findAllChatThreads() {
      return this.Thread.findAll({ where: { type: "conversation", archived: false } });
    }
    
    listConversationThreadsByUserGroupId(userGroupId) {
      return this.ThreadUserGroupRole.findAll({ where: { userGroupId: userGroupId } })
        .then((threadUserGroupRoles) => {
          return this.Thread.findAll({ where: { 
            id: {$in: _.map(threadUserGroupRoles, "threadId") },
            archived: false
          }});
        });
    }
    
    getThreadUserGroupRoleMap(threadId) {
      return this.findThread(threadId)
        .then((thread) => {
          if (thread.type === "conversation") {
            return this.listThreadUserGroupRolesByThreadId(thread.id)
              .then((threadUserGroupRoles) => {
                const result = {};
        
                _.forEach(threadUserGroupRoles, (threadUserGroupRole) => {
                  result[threadUserGroupRole.userGroupId] = threadUserGroupRole.role;
                });
                
                return result;
              });
          } else if (thread.type === "question") {
            return this.findQuestionGroupByThreadId(thread.id)
              .then((questionGroup) => {
                return this.getQuestionGroupUserGroupRoleMap(questionGroup.id);
              });
          }
        });
    }
    
    getQuestionGroupManagerUserGroupIds(questionGroupId) {
      return this.findQuestionGroupUserGroupRolesByquestionGroupIdAndRole(questionGroupId, "manager")
        .then((questionGroupUserGroupRoles) => {
          const result = [];

          _.forEach(questionGroupUserGroupRoles, (questionGroupUserGroupRole) => {
            result.push(questionGroupUserGroupRole.userGroupId);
          });

          return result;
        });
    }
    
    findQuestionGroupUserGroupRolesByquestionGroupIdAndRole(questionGroupId, role) {
      return this.QuestionGroupUserGroupRole.findAll({ where: { questionGroupId : questionGroupId, role: role } });
    }
    
    getQuestionGroupUserGroupRoleMap(questionGroupId) {
      return this.listQuestionGroupUserGroupRolesByQuestionGroupId(questionGroupId)
        .then((questionGroupUserGroupRoles) => {
          const result = {};

          _.forEach(questionGroupUserGroupRoles, (questionGroupUserGroupRole) => {
            result[questionGroupUserGroupRole.userGroupId] = questionGroupUserGroupRole.role;
          });

          return result;
        });
    }
    
    getQuestionGroupsUserGroupRoleMaps(questionGroupIds) {
      return this.listQuestionGroupUserGroupRolesByQuestionGroupIds(questionGroupIds)
        .then((questionGroupUserGroupRoles) => {
          const result = {};

          _.forEach(questionGroupUserGroupRoles, (questionGroupUserGroupRole) => {
            if (!result[questionGroupUserGroupRole.questionGroupId]) {
              result[questionGroupUserGroupRole.questionGroupId] = {};
            }
            result[questionGroupUserGroupRole.questionGroupId][questionGroupUserGroupRole.userGroupId] = questionGroupUserGroupRole.role;
          });

          return result;
        });
    }
    
    listThreadUserGroupIds(threadId) {
      return this.findThread(threadId)
        .then((thread) => {
          if (!thread) {
            this.logger.error("Thread not found");
            return [];
          } else {
            if (thread.type === "conversation") {
              return this.listThreadUserGroupRolesByThreadId(thread.id)
                .then((threadUserGroupRole) => {
                  return _.map(threadUserGroupRole, "userGroupId");
                });
            } else if (thread.type === "question") {
              return this.findQuestionGroupByThreadId(thread.id)
                .then((questionGroup) => {
                  return this.listQuestionGroupUserGroupIds(questionGroup.id);
                });
            }
          }
        });
    }
    
    listThreadUserGroupRolesByThreadId(threadId) {
      return this.ThreadUserGroupRole.findAll({ where: { threadId : threadId } });
    }
    
    /**
     * Updates thread
     * 
     * @param {Number} id thread id 
     * @param {String} title title
     * @param {String} description description
     * @param {String} imageUrl image url
     * @param {Boolean} silentUpdate silent update
     * @param {String} answerType answer type
     */
    updateThread(id, title, description, imageUrl, silentUpdate, answerType) {
      return this.Thread.update({
        title: title,
        description: description,
        imageUrl: imageUrl,
        archived: false,
        answerType: answerType
      }, {
        where: {
          id: id
        },
        silent: silentUpdate ? silentUpdate : false
      });
    }
    
    setThreadUserGroupRoles(threadId, roleMap) {
      const newUserGroups = _.map(roleMap, (role, userGroupId) => {
        return userGroupId;
      });
      
      return this.ThreadUserGroupRole.destroy({ 
          where: { 
            threadId : threadId,
            userGroupId: {
              $notIn: newUserGroups
            }
          } 
        })
        .then(() => {
          const roleUpsertPromises = _.map(roleMap, (role, userGroupId) => {
            return this.ThreadUserGroupRole.upsert({
              threadId: threadId,
              userGroupId: userGroupId,
              role: role
            });
          });

          return Promise.all(roleUpsertPromises);
        });
    }
    
    findQuestionGroupUserThreadsByThreadId(threadId) {
      return this.QuestionGroupUserThread.findAll({ where: { threadId: threadId } });
    }
    
    // Messages
    
    createMessage(threadId, userId, contents) {
      return this.Message.create({
        threadId: threadId,
        userId: userId,
        contents: contents
      });
    }
    
    findMessage(id) {
      return this.Message.findOne({ where: { id : id } });
    }
    
    listMessagesByThreadId(threadId, firstResult, maxResults) {
      if (!threadId) {
        return Promise.resolve([]);
      }
      
      return this.Message.findAll({ where: { threadId : threadId }, offset: firstResult, limit: maxResults, order: [ [ "createdAt", "DESC" ] ] });
    }

    updateMessage(id, contents) {
      return this.Message.update({
        contents: contents
      }, {
        where: {
          id: id
        }
      });
    }
    
    deleteMessage(id) {
      return this.Message.destroy({ where: { id : id } });
    }
    
    getLatestMessageCreatedByThreadIds(threadIds) {
      return this.Message.max("createdAt", { where: { threadId: { $in: threadIds } } });
    }
  
    // QuestionGroup
      
    createQuestionGroup(originId, title, imageUrl) {
      return this.QuestionGroup.create({
        title: title,
        originId: originId,
        imageUrl: imageUrl
      });
    }
    
    archiveQuestionGroup(id) {
      return this.QuestionGroup.update({ archived: true }, { where: { id: id } });
    }
    
    findQuestionGroup(id) {
      return this.QuestionGroup.findOne({ where: { id : id } });
    }
    
    findAllQuestionGroups() {
      return this.QuestionGroup.findAll({ where: { archived: false }});
    }
    
    findQuestionGroupByThreadId(threadId) {
      return this.QuestionGroupUserThread.findOne({ where: { threadId : threadId } })
        .then((questionGroupUserThread) => {
          if (questionGroupUserThread) {
            return this.findQuestionGroup(questionGroupUserThread.questionGroupId);
          } else {
            return null;
          }
        });
    }
    
    findQuestionGroupByOriginId(originId) {
      return this.QuestionGroup.findOne({ where: { originId : originId } });
    }
    
    listQuestionGroupsByUserGroupId(userGroupId) {
      return this.QuestionGroupUserGroupRole.findAll({ where: { userGroupId: userGroupId } })
        .then((questionGroupUserGroupRoles) => {
          return this.QuestionGroup.findAll({ where: { 
            id: {$in: _.map(questionGroupUserGroupRoles, "questionGroupId") },
            archived: false
          }});
        });
    }
    
    async listQuestionGroupsByUserGroupIds(userGroupIds) {
      const questionGroupUserGroupRoles = await this.QuestionGroupUserGroupRole.findAll({ where: { userGroupId: { $in: userGroupIds} } });
      return this.QuestionGroup.findAll({ where: {
        id: {$in: _.map(questionGroupUserGroupRoles, "questionGroupId") },
        archived: false
      }});
    }
    
    listQuestionGroupsByUserGroupIdsAndRole(userGroupIds, role) {
      return this.QuestionGroupUserGroupRole.findAll({ where: {
          userGroupId: {$in: userGroupIds },
          role: role
        }})
        .then((questionGroupUserGroupRoles) => {
          return this.QuestionGroup.findAll({ where: { 
            id: {$in: _.map(questionGroupUserGroupRoles, "questionGroupId") },
            archived: false
          }});
        });
    }
    
    updateQuestionGroup(id, title, imageUrl, silentUpdate) {
      return this.QuestionGroup.update({
        title: title,
        imageUrl: imageUrl,
        archived: false
      }, {
        where: {
          id: id
        },
        silent: silentUpdate ? silentUpdate : false
      });
    }
    
    setQuestionGroupUserGroupRoles(questionGroupId, roleMap) {
      const newUserGroups = _.map(roleMap, (role, userGroupId) => {
        return userGroupId;
      });
      
      return this.QuestionGroupUserGroupRole.destroy({ 
          where: { 
            questionGroupId : questionGroupId,
            userGroupId: {
              $notIn: newUserGroups
            }
          } 
        })
        .then(() => {
          const roleUpsertPromises = _.map(roleMap, (role, userGroupId) => {
            return this.QuestionGroupUserGroupRole.upsert({
              questionGroupId: questionGroupId,
              userGroupId: userGroupId,
              role: role
            });
          });

          return Promise.all(roleUpsertPromises);
        });
    }
    
    // QuestionGroupUserThreads
    
    createQuestionGroupUserThread(questionGroupId, threadId, userId) {
      return this.QuestionGroupUserThread.create({
        threadId: threadId,
        questionGroupId: questionGroupId,
        userId: userId
      });
    }
    
    findQuestionGroupUserThread(id) {
      return this.QuestionGroupUserThread.findOne({ where: { id : id } });
    }
    
    findQuestionGroupUserThreadByQuestionGroupIdAndUserId(questionGroupId, userId) {
      return this.QuestionGroupUserThread.findOne({ where: { questionGroupId : questionGroupId, userId: userId } } );
    }
    
    findOrCreateQuestionGroupUserThreadByQuestionGroupIdAndUserId(questionGroupId, userId) {
      return this.findQuestionGroupUserThreadByQuestionGroupIdAndUserId(questionGroupId, userId)
        .then((questionGroupUserThread) => {
          if (questionGroupUserThread) {
            return this.findThread(questionGroupUserThread.threadId)
              .then((thread) => {
                return {
                  thread: thread,
                  created: false
                };
              });
          } else {
            return this.createThread(null, null, "question", null, "TEXT")
              .then((thread) => {
                return this.createQuestionGroupUserThread(questionGroupId, thread.id, userId)
                  .then(() => {
                    return {
                      thread: thread,
                      created: true
                    };
                  });
              });
          }
        });
    }
    
    listQuestionGroupUserThreadsByQuestionGroupId(questionGroupId) {
      return this.QuestionGroupUserThread.findAll({ where: { questionGroupId : questionGroupId } } );
    }
    
    listQuestionGroupUserThreadsByQuestionGroupIds(questionGroupIds) {
      return this.QuestionGroupUserThread.findAll({ where: { questionGroupId : { $in: questionGroupIds } } } );
    }
    
    // News Articles
    
    createNewsArticle(originId, title, contents, imageUrl) {
      return this.NewsArticle.create({
        title: title,
        contents: contents,
        originId: originId,
        imageUrl: imageUrl
      });
    }
    
    removeNewsArticle(id) {
      return this.NewsArticle.destroy({ where: {id: id} });
    }
    
    findNewsArticle(id) {
      return this.NewsArticle.findOne({ where: { id : id } });
    }
    
    findAllNewsArticles() {
      return this.NewsArticle.findAll();
    }
    
    findNewsArticleByOriginId(originId) {
      return this.NewsArticle.findOne({ where: { originId : originId } });
    }
    
    listNewsArticles(firstResult, maxResults) {
      return this.NewsArticle.findAll({ offset: firstResult, limit: maxResults });
    }
    
    updateNewsArticle(id, title, contents, imageUrl, silentUpdate) {
      return this.NewsArticle.update({
        title: title,
        contents: contents,
        imageUrl: imageUrl
      }, {
        where: {
          id: id
        },
        silent: silentUpdate ? silentUpdate : false
      });
    }
    
    // MessageAttachment
    
    createMessageAttachment(messageId, contents, contentType, fileName, size) {
      return this.MessageAttachment.create({
        messageId: messageId,
        contents: contents,
        contentType: contentType,
        fileName: fileName,
        size: size
      });
    }
    
    findMessageAttachments(id) {
      return this.MessageAttachment.findOne({ where: { id : id } });
    }
    
    deleteMessageAttachmentsByMessageId(messageId) {
      return this.MessageAttachment.destroy({ where: { messageId : messageId } });
    }
    
    // ItemRead
    
    createItemRead(itemId, userId) {
      return this.ItemRead.create({
          itemId: itemId,
          userId: userId
      });
    }
    
    findItemRead(itemId, userId) {
      return this.ItemRead.findOne({ where: { userId: userId, itemId: itemId } });
    }
    
    findItemReads(itemIds, userId) {
      return this.ItemRead.findAll({ where: { userId: userId, itemId: { $in: itemIds } } });
    }
    
    updateItemRead(id, itemId, userId) {
      return this.ItemRead.update({
      }, {
        where: {
          id: id
        }
      });
    }
    
    upsertItemRead(itemId, userId) {
      return this.findItemRead(itemId, userId)
        .then((itemRead) => {
          if (itemRead) {
            return this.updateItemRead(itemRead.id);  
          } else {
            return this.createItemRead(itemId, userId);
          }
        });
    }
    
    // QuestionGroupUserGroupRole
    
    createQuestionGroupUserGroupRole(questionGroupId, userGroupId, role) {
      return this.QuestionGroupUserGroupRole.create({
        questionGroupId: questionGroupId, 
        userGroupId: userGroupId,
        role: role
      });
    }
    
    findQuestionGroupUserGroupRole(questionGroupId, userGroupId) {
      return this.QuestionGroupUserGroupRole.findOne({ where: { questionGroupId: questionGroupId, userGroupId: userGroupId } });
    }
    
    listQuestionGroupUserGroupRolesByQuestionGroupId(questionGroupId) {
      return this.QuestionGroupUserGroupRole.findAll({ where: { questionGroupId : questionGroupId } });
    }
    
    listQuestionGroupUserGroupRolesByQuestionGroupIds(questionGroupIds) {
      return this.QuestionGroupUserGroupRole.findAll({ where: { questionGroupId : { $in: questionGroupIds } } });
    }
    
    listQuestionGroupUserGroupIds(questionGroupId) {
      return this.listQuestionGroupUserGroupRolesByQuestionGroupId(questionGroupId)
        .then((questionGroupUserGroupRole) => {
          return _.map(questionGroupUserGroupRole, "userGroupId");
        });
    }
    
    updateQuestionGroupUserGroupRole(id, role) {
      return this.QuestionGroupUserGroupRole.update({
        role: role
      }, {
        where: {
          id: id
        }
      });
    }
    
    upsertQuestionGroupUserGroupRole(questionGroupId, userGroupId, role) {
      return this.findQuestionGroupUserGroupRole(questionGroupId, userGroupId)
        .then((questionGroupUserGroupRole) => {
          if (questionGroupUserGroupRole) {
            return this.updateQuestionGroupUserGroupRole(questionGroupUserGroupRole.id, role);  
          } else {
            return this.createQuestionGroupUserGroupRole(questionGroupId, userGroupId, role);
          }
        });
    }
    
    register() {
    }
    
    createThreadLatestMessagePromise(thread) {
      return this.getLatestMessageCreatedByThreadIds([thread.dataValues.id]).then((maxCreatedAt) => {
        thread.latestMessage = maxCreatedAt;
      });
    }
    
    // ItemGroups
    
    /**
     * new item group
     * 
     * @param {String} sapId sapId
     * @param {String} name name
     * @param {String} displayName display name
     * @param {String} category category
     * @param {Double} minimumProfitEstimation minimum profit estimation
     * @param {int} prerequisiteContractItemGroupId prerequisiteContractItemGroupId
     * @return {Promise} promise for created item group
     */
    createItemGroup(sapId, name, displayName, category, minimumProfitEstimation, prerequisiteContractItemGroupId) {
     return this.ItemGroup.create({
        sapId: sapId,
        name: name,
        displayName: displayName,
        category: category,
        minimumProfitEstimation: minimumProfitEstimation,
        prerequisiteContractItemGroupId: prerequisiteContractItemGroupId
      });
    }
    
    /**
     * Updates item group
     * 
     * @param {int} id item group id
     * @param {String} name name
     * @param {String} displayName displayName
     * @param {String} category category
     * @param {Double} minimumProfitEstimation minimum profit estimation
     * @param {int} prerequisiteContractItemGroupId prerequisiteContractItemGroupId
     * @return {Promise} promise for updated item group
     */
    updateItemGroup(id, name, displayName, category, minimumProfitEstimation, prerequisiteContractItemGroupId) {
      return this.ItemGroup.update({
        name: name,
        displayName: displayName,
        category: category,
        minimumProfitEstimation: minimumProfitEstimation,
        prerequisiteContractItemGroupId: prerequisiteContractItemGroupId
      }, {
        where: {
          id: id
        }
      });
    }
    
    /**
     * Finds a item group by id
     * 
     * @param {int} id item group id
     * @return {Promise} promise for item group
     */
    findItemGroupById(id) {
      return this.ItemGroup.findOne({ where: { id : id } });
    }
    
    /**
     * Finds a item group by externalId
     * 
     * @param {String} externalId item group externalId
     * @return {Promise} promise for item group
     */
    findItemGroupByExternalId(externalId) {
      return this.ItemGroup.findOne({ where: { externalId : externalId } });
    }
    
    /**
     * Finds a item group by sapId
     * 
     * @param {String} sapId item group sapId
     * @return {Promise} promise for item group
     */
    findItemGroupBySapId(sapId) {
      return this.ItemGroup.findOne({ where: { sapId : sapId } });
    }
    
    /**
     * Lists item groups
     * 
     * @param {int} firstResult first result
     * @param {int} maxResults max results
     * @return {Promise} promise for item groups
     */
    listItemGroups(firstResult, maxResults) {
      return this.ItemGroup.findAll({ where: { }, offset: firstResult, limit: maxResults });
    }
    
    /**
     * Deletes an item group
     * 
     * @param {int} id item group id
     * @return {Promise} promise that resolves on successful removal
     */
    deleteItemGroup(id) {
      return this.ItemGroup.destroy({ where: { id : id } });
    }

    // ItemGroupPrice
    
    /**
     * new item group price
     * 
     * @param {int} itemGroupId item group id
     * @param {String} groupName group
     * @param {String} unit unit
     * @param {String} price price
     * @param {Integer} year year
     * @return {Promise} promise for created item group price
     */
    createItemGroupPrice(itemGroupId, groupName, unit, price, year) {
      return this.ItemGroupPrice.create({
        itemGroupId: itemGroupId,
        groupName: groupName,
        unit: unit,
        price: price,
        year: year
      });
    }
     
    /**
     * Finds a item group price by id
     * 
     * @param {int} id item group id
     * @return {Promise} promise for item group
     */
    findItemGroupPriceById(id) {
      return this.ItemGroupPrice.findOne({ where: { id : id } });
    }
     
    /**
     * Finds an item group price by externalId
     * 
     * @param {String} externalId item group external id
     * @return {Promise} promise for delivery place
     */
    findItemGroupPriceByExternalId(externalId) {
      return this.ItemGroupPrice.findOne({ where: { externalId : externalId } });
    }
     
    /**
     * Lists item group prices.
     * 
     * All parameters are optional and ignored if not given
     * 
     * @param {int} itemGroupId item group id
     * @param {int} firstResult first result
     * @param {int} maxResults max results
     * @param {String} orderBy order by column (defaults to createdAt)
     * @param {String} orderDir order direction (defaults to DESC)
     * @return {Promise} promise for item group
     */
    listItemGroupPrices(itemGroupId, year, firstResult, maxResults, orderBy, orderDir) {
      const where = {};

      if (itemGroupId) {
        where.itemGroupId = itemGroupId;
      }

      if (year) {
        where.year = year;
      }

      return this.ItemGroupPrice.findAll({ 
        where: where,
        offset: firstResult, 
        limit: maxResults,
        order: [[ orderBy || "createdAt", orderDir || "DESC" ] ]
      });
    }

    /**
     * Update item group price
     * 
     * @param {int} id item group id
     * @param {int} itemGroupId item group id
     * @param {String} groupName group
     * @param {String} unit unit
     * @param {String} price price
     * @param {Integer} year year
     * @return {Promise} promise for created item group price
     */
    updateItemGroupPrice(id, itemGroupId, groupName, unit, price, year) {
      return this.ItemGroupPrice.update({
        itemGroupId: itemGroupId,
        groupName: groupName,
        unit: unit,
        price: price,
        year: year
      }, {
        where: {
          id: id
        }
      });
    }

    /**
     * Deletes an item group price
     * 
     * @param {int} id item group price id
     * @return {Promise} promise that resolves on successful removal
     */
    deleteItemGroupPrice(id) {
      return this.ItemGroupPrice.destroy({ where: { id : id } });
    }    
    
    // DeliveryPlaces
    
    /**
     * new delivery place
     * 
     * @param {String} sapId sapId
     * @param {String} name name
     * @return {Promise} promise for created delivery place
     */
    createDeliveryPlace(sapId, name) {
      return this.DeliveryPlace.create({
        sapId: sapId,
        name: name
      });
    }
     
    /**
     * Finds a delivery place by id
     * 
     * @param {int} id delivery place id
     * @return {Promise} promise for delivery place
     */
    findDeliveryPlaceById(id) {
      return this.DeliveryPlace.findOne({ where: { id : id } });
    }
     
    /**
     * Finds a delivery place by externalId
     * 
     * @param {String} externalId delivery place externalId
     * @return {Promise} promise for delivery place
     */
    findDeliveryPlaceByExternalId(externalId) {
      return this.DeliveryPlace.findOne({ where: { externalId : externalId } });
    }
     
    /**
     * Finds a delivery place by sapId
     * 
     * @param {String} sapId delivery place sapId
     * @return {Promise} promise for delivery place
     */
    findDeliveryPlaceBySapId(sapId) {
      return this.DeliveryPlace.findOne({ where: { sapId : sapId } });
    }
     
    /**
     * Lists delivery places
     * 
     * @param {int} firstResult first result
     * @param {int} maxResults max results
     * @return {Promise} promise for delivery places
     */
    listDeliveryPlaces(firstResult, maxResults) {
      return this.DeliveryPlace.findAll({ where: { }, offset: firstResult, limit: maxResults });
    }
     
    /**
     * Updates delivery place
     * 
     * @param {int} id delivery place id
     * @param {String} name name
     * @return {Promise} promise for updated delivery place
     */
    updateDeliveryPlace(id, name) {
      return this.DeliveryPlace.update({
        name: name
      }, {
        where: {
          id: id
        }
      });
    }
     
    /**
     * Deletes an delivery place
     * 
     * @param {int} id delivery place id
     * @return {Promise} promise that resolves on successful removal
     */
    deleteDeliveryPlace(id) {
      return this.DeliveryPlace.destroy({ where: { id : id } });
    }

    // Contracts

    /**
     * Create new contract
     * 
     * @param {String} userId contract's user id
     * @param {int} year year
     * @param {int} deliveryPlaceId delivery place id
     * @param {int} proposedDeliveryPlaceId proposed delivery place id
     * @param {int} itemGroupId item group id
     * @param {String} sapId sap id
     * @param {int} contractQuantity contract quantity
     * @param {int} deliveredQuantity delivered quantity
     * @param {int} proposedQuantity proposed quantity
     * @param {Date} startDate start date
     * @param {Date} endDate end date 
     * @param {Date} signDate sign date
     * @param {Date} termDate term date
     * @param {String} status status
     * @param {String} areaDetails area details JSON
     * @param {Boolean} deliverAll deliver all
     * @param {String} remarks remarks
     * @param {String} deliveryPlaceComment delivery place comment
     * @param {String} quantityComment quantity comment
     * @param {String} rejectComment reject  comment
     * 
     * @returns {Promise} promise for new contract
     */
    createContract(userId, year, deliveryPlaceId, proposedDeliveryPlaceId, itemGroupId, sapId, contractQuantity, deliveredQuantity, proposedQuantity, 
      startDate, endDate, signDate, termDate, status, areaDetails, deliverAll, remarks, deliveryPlaceComment, quantityComment, rejectComment) {

      return this.Contract.create({
        userId: userId,
        year: year,
        deliveryPlaceId: deliveryPlaceId,
        proposedDeliveryPlaceId: proposedDeliveryPlaceId,
        itemGroupId: itemGroupId,
        sapId: sapId,
        contractQuantity: contractQuantity,
        deliveredQuantity: deliveredQuantity,
        proposedQuantity: proposedQuantity,
        startDate: startDate,
        endDate: endDate,
        signDate: signDate,
        termDate: termDate,
        status: status,
        areaDetails: areaDetails, 
        deliverAll: deliverAll,
        remarks: remarks,
        deliveryPlaceComment: deliveryPlaceComment,
        quantityComment: quantityComment,
        rejectComment: rejectComment
      });
    }

    /**
     * Updates a contract status 
     * 
     * @param {int} id 
     * @param {String} status 
     * 
     * @returns {Promise} promise for update
     */
    updateContractStatus(id, status) {
      return this.Contract.update({
        status: status
      }, {
        where: {
          id: id
        }
      });
    }

    /**
     * Updates a contract sapId 
     * 
     * @param {int} id 
     * @param {String} sapId 
     * 
     * @returns {Promise} promise for update
     */
    updateContractSapId(id, sapId) {
      return this.Contract.update({
        sapId: sapId
      }, {
        where: {
          id: id
        }
      });
    }

    /**
     * Updates a contract deliveredQuantity 
     * 
     * @param {int} id 
     * @param {String} deliveredQuantity 
     * 
     * @returns {Promise} promise for update
     */
    updateContractDeliveredQuantity(id, deliveredQuantity) {
      return this.Contract.update({
        deliveredQuantity: deliveredQuantity
      }, {
        where: {
          id: id
        }
      });
    }

    /**
     * Updates a contract 
     * 
     * @param {int} id contract id
     * @param {String} userId contract's user id
     * @param {int} year year
     * @param {int} deliveryPlaceId delivery place id
     * @param {String} sapId SAP id
     * @param {int} proposedDeliveryPlaceId proposed delivery place id
     * @param {int} itemGroupId item group id
     * @param {String} sapId sap id
     * @param {int} contractQuantity contract quantity
     * @param {int} deliveredQuantity delivered quantity
     * @param {int} proposedQuantity proposed quantity
     * @param {Date} startDate start date
     * @param {Date} endDate end date 
     * @param {Date} signDate sign date
     * @param {Date} termDate term date
     * @param {String} status status
     * @param {String} areaDetails area details JSON
     * @param {Boolean} deliverAll deliver all
     * @param {String} remarks remarks
     * @param {String} deliveryPlaceComment delivery place comment
     * @param {String} quantityComment quantity comment
     * @param {String} rejectComment reject  comment
     * 
     * @returns {Promise} promise for update
     */
    updateContract(id, year, deliveryPlaceId, proposedDeliveryPlaceId, itemGroupId, sapId, contractQuantity, deliveredQuantity, proposedQuantity, 
      startDate, endDate, signDate, termDate, status, areaDetails, deliverAll, remarks, deliveryPlaceComment, quantityComment, rejectComment) {

      return this.Contract.update({
        year: year,
        deliveryPlaceId: deliveryPlaceId,
        proposedDeliveryPlaceId: proposedDeliveryPlaceId,
        itemGroupId: itemGroupId,
        sapId: sapId,
        contractQuantity: contractQuantity,
        deliveredQuantity: deliveredQuantity,
        proposedQuantity: proposedQuantity,
        startDate: startDate,
        endDate: endDate,
        signDate: signDate,
        termDate: termDate,
        status: status,
        areaDetails: areaDetails, 
        deliverAll: deliverAll,
        remarks: remarks,
        deliveryPlaceComment: deliveryPlaceComment,
        quantityComment: quantityComment,
        rejectComment: rejectComment
      }, {
        where: {
          id: id
        }
      });
    }

    /**
     * Finds a contract by id
     * 
     * @param {int} id contract id
     * @return {Promise} promise for contract
     */
    findContractById(id) {
      return this.Contract.findOne({ where: { id : id } });
    }
    
    /**
     * Finds a contract by externalId
     * 
     * @param {String} externalId contract externalId
     * @return {Promise} promise for contract
     */
    findContractByExternalId(externalId) {
      return this.Contract.findOne({ where: { externalId : externalId } });
    }
    
    /**
     * Finds a contract by sapId
     * 
     * @param {String} sapId contract sapId
     * @return {Promise} promise for contract
     */
    findContractBySapId(sapId) {
      return this.Contract.findOne({ where: { sapId : sapId } });
    }

    /**
     * Lists contracts. 
     * 
     * All parameters are optional and ignored if not given
     *  
     * @param {String} userId user id
     * @param {String} itemGroupCategory item group category
     * @param {String} itemGroupId item group id
     * @param {String} year year
     * @param {String} status status
     * @param {int} firstResult first result
     * @param {int} maxResults max results
     * @return {Promise} promise for contracts
     */
    listContracts(userId, itemGroupCategory, itemGroupId, year, status, firstResult, maxResults) {
      const where = this.createListContractsWhere(userId, itemGroupCategory, itemGroupId, year, status);

      return this.Contract.findAll({ 
        where: where, 
        offset: firstResult, 
        limit: maxResults
      });
    }

    /**
     * Lists contracts sap id is not null and have a specified status
     * 
     * @param {String} status status
     * @return {Promise} promise for contracts
     */
    listContractsByStatusAndSapIdNotNull(status) {
      return this.Contract.findAll({ 
        where: {
          status: status,
          sapId: {
            [this.Sequelize.Op.ne]: null
          }
        }
      });
    }

    /**
     * Lists contracts sap id is null and have a specified status
     * 
     * @param {String} status status
     * @return {Promise} promise for contracts
     */
    listContractsByStatusAndSapIdIsNull(status) {
      return this.Contract.findAll({ 
        where: {
          status: status,
          sapId: {
            [this.Sequelize.Op.eq]: null
          }
        }
      });
    }

    /**
     * Counts contracts. 
     * 
     * All parameters are optional and ignored if not given
     *  
     * @param {String} userId user id
     * @param {String} itemGroupCategory item group category
     * @param {String} itemGroupId item group id
     * @param {String} year year
     * @param {String} status status
     * @return {Promise} promise for contracts
     */
    countContracts(userId, itemGroupCategory, itemGroupId, year, status) {
      const where = this.createListContractsWhere(userId, itemGroupCategory, itemGroupId, year, status);

      return this.Contract.count({ 
        where: where
      });
    }

    /**
     * Creates a where clause for listing / counting contracts. 
     * 
     * All parameters are optional and ignored if not given
     *  
     * @param {String} userId user id
     * @param {String} itemGroupCategory item group category
     * @param {String} itemGroupId item group id
     * @param {String} year year
     * @param {String} status status
     * @return {Object} where clause
     */
    createListContractsWhere(userId, itemGroupCategory, itemGroupId, year, status) {
      const where = {};

      if (userId) {
        where.userId = userId;
      }

      if (itemGroupId) {
        where.itemGroupId = itemGroupId;
      }

      if (year) {
        where.year = year;
      }

      if (status) {
        where.status = status;
      }

      if (itemGroupCategory) {
        const categorySQL = this.sequelize.dialect.QueryGenerator.selectQuery("ItemGroups", {
          attributes: ["id"],
          where: { category: itemGroupCategory }
        }).slice(0, -1);

        where.itemGroupId = { [this.Sequelize.Op.in]: this.sequelize.literal(`(${categorySQL})`) };
      }

      return where;
    }
    
    /**
     * Deletes an contract
     * 
     * @param {int} id contract id
     * @return {Promise} promise that resolves on successful removal
     */
    deleteContract(id) {
      return this.Contract.destroy({ where: { id : id } });
    }
    
    // DocumentTemplate

    /**
     * Creates new document template
     * 
     * @param {String} contents contents HTML
     * @param {String} header header HTML
     * @param {String} footer footer HTML
     */
    createDocumentTemplate(contents, header, footer) {
      return this.DocumentTemplate.create({
        contents: contents,
        header: header,
        footer: footer
      });
    }
    
    /**
     * Finds a document template by id
     * 
     * @param {int} id document template id
     * @return {Promise} promise for document template
     */
    findDocumentTemplateById(id) {
      return this.DocumentTemplate.findOne({ where: { id : id } });
    }

    /**
     * Updates a document template
     * 
     * @param {int} id document template id
     * @param {String} contents template contents
     * @param {String} header template header
     * @param {String} footer template footer
     * @return {Promise} promise for update
     */
    updateDocumentTemplate(id, contents, header, footer) {
      return this.DocumentTemplate.update({
        contents: contents, 
        header: header,
        footer: footer
      }, {
        where: {
          id: id
        }
      });
    }
    
    // ContractDocumentTemplate
      
    /**
     * Creates new contract document template
     * 
     * @param {String} type type
     * @param {int} contractId contract id
     * @param {int} documentTemplateId document template id
     */
    createContractDocumentTemplate(type, contractId, documentTemplateId) {
      return this.ContractDocumentTemplate.create({
        type: type,
        contractId: contractId,
        documentTemplateId: documentTemplateId
      });
    }

    /**
     * Finds a contract document template by externalId
     * 
     * @param {String} externalId external id
     * @return {Promise} promise for contract document template
     */
    findContractDocumentTemplateByExternalId(externalId) {
      return this.ContractDocumentTemplate.findOne({ where: { externalId: externalId } });
    }
      
    /**
     * Finds a contract document template by type and contract id
     * 
     * @param {String} type document template type
     * @param {int} contractId contract id
     * @return {Promise} promise for contract document template
     */
    findContractDocumentTemplateByTypeAndContractId(type, contractId) {
      return this.ContractDocumentTemplate.findOne({ where: { type : type, contractId: contractId } });
    }
      
    /**
     * List contract document templates by contractId
     * 
     * @param {int} contractId contract id
     * @return {Promise} promise for contract document templates
     */
    listContractDocumentTemplateByContractId(contractId) {
      return this.ContractDocumentTemplate.findAll({ where: { contractId: contractId } });
    }
    
    // ItemGroupDocumentTemplate
    
    /**
     * Creates new item group document template
     * 
     * @param {String} type type
     * @param {int} itemGroupId item group id
     * @param {int} documentTemplateId document template id
     */
    createItemGroupDocumentTemplate(type, itemGroupId, documentTemplateId) {
      return this.ItemGroupDocumentTemplate.create({
        type: type,
        itemGroupId: itemGroupId,
        documentTemplateId: documentTemplateId
      });
    }

    /**
     * Finds an item group document template by type and itemGroupId id
     * 
     * @param {String} type document template type
     * @param {int} contractId contract id
     * @return {Promise} promise for contract document template
     */
    findItemGroupDocumentTemplateByTypeAndItemGroupId(type, itemGroupId) {
      return this.ItemGroupDocumentTemplate.findOne({ where: { type : type, itemGroupId: itemGroupId } });
    }

    /**
     * Finds an item group document template by externalId
     * 
     * @param {String} externalId externalId
     * @return {Promise} promise for contract document template
     */
    findItemGroupDocumentTemplateByExternalId(externalId) {
      return this.ItemGroupDocumentTemplate.findOne({ where: { externalId: externalId } });
    }
      
    /**
     * List item group document templates by itemGroupId
     * 
     * @param {int} contractId contract id
     * @return {Promise} promise for contract document templates
     */
    listItemGroupDocumentTemplateByItemGroupId(itemGroupId) {
      return this.ItemGroupDocumentTemplate.findAll({ where: { itemGroupId: itemGroupId } });
    }
    
    // ContractDocument
    
    /**
     * Create contract document
     * 
     * @param {String} type type
     * @param {int} contractId contract id
     * @param {String} vismaSignDocumentId visma sign document id
     * @returns {Promise} Promise for ContractDocument
     */
    createContractDocument(type, contractId, vismaSignDocumentId) {
      return this.ContractDocument.create({
        type: type,
        contractId: contractId,
        vismaSignDocumentId: vismaSignDocumentId,
        signed: false
      });
    }
    
    /**
     * Finds contract document by id
     * 
     * @param {int} id contract id
     * @returns {Promise} Promise for ContractDocument
     */
    findContractDocumentById(id) {
      return this.ContractDocument.findOne({ where: { id : id } });
    }
    
    /**
     * Finds contract document by contract id and type
     * 
     * @param {int} contractId contract id
     * @param {String} type type
     * @returns {Promise} Promise for ContractDocument
     */
    findContractDocumentByContractAndType(contractId, type) {
      return this.ContractDocument.findOne({ 
        where: {
          type: type,
          contractId: contractId
        }
      });
    }
    
    /**
     * Finds contract document by visma document id
     * 
     * @param {String} vismaSignDocumentId vismaSignDocumentId
     * @returns {Promise} Promise for ContractDocument
     */
    findContractDocumentByVismaSignDocumentId(vismaSignDocumentId) {
      return this.ContractDocument.findOne({ 
        where: {
          vismaSignDocumentId: vismaSignDocumentId
        }
      });
    }
    
    /**
     * Lists contracts documents by signed
     * 
     * @param {boolean} signed signed
     * @returns {Promise} Promise for ContractDocuments
     */
    listContractDocumentsBySigned(signed) {
      return this.ContractDocument.findAll({ where: { signed: signed } });
    }
    
    /**
     * Updates contract document signing status
     * 
     * @param {int} id id
     * @param {boolean} signed signed
     * @returns {Promise} Promise for ContractDocument
     */
    updateContractDocumentSigned(id, signed) {
      return this.ContractDocument.update({
        signed: signed
      }, {
        where: {
          id: id
        }
      });
    }

    /**
     * Deletes contract document
     * 
     * @param {int} id contract document id 
     */
    deleteContractDocument(id) {
      return this.ContractDocument.destroy({ where: { id : id } });
    }
    
    // OperationReport
    
    /**
     * Create operation report
     * 
     * @param {String} type type
     * @returns {Promise} Promise for OperationReport
     */
    createOperationReport(type) {
      return this.OperationReport.create({
        type: type
      });
    }

    /**
     * Finds a operation report by externalId
     * 
     * @param {String} externalId operation report externalId
     * @return {Promise} promise for operation report
     */
    findOperationReportByExternalId(externalId) {
      return this.OperationReport .findOne({ where: { externalId : externalId } });
    }

    /**
     * List operation reports
     * 
     * @param orderBy order by column (defaults to createdAt)
     * @param orderDir order direction (defaults to DESC)
     * @param firstResult first result
     * @param maxResults maximum number of results
     * @returns {Promise} Promise for OperationReports
     */
    listOperationReports(orderBy, orderDir, firstResult, maxResults) {
      return this.OperationReport.findAll({ offset: firstResult, limit: maxResults, order: [ [ orderBy || "createdAt", orderDir || "DESC" ] ] });
    }

    /**
     * List operation reports by type
     * 
     * @param {String} type type
     * @param orderBy order by column (defaults to createdAt)
     * @param orderDir order direction (defaults to DESC)
     * @param firstResult first result
     * @param maxResults maximum number of results
     * @returns {Promise} Promise for OperationReports
     */
    listOperationReportsByType(type, orderBy, orderDir, firstResult, maxResults) {
      return this.OperationReport.findAll({ where: { type: type }, offset: firstResult, limit: maxResults, order: [[orderBy || "createdAt", orderDir || "DESC" ]] });
    }

    /**
     * Counts operation reports
     * 
     * @returns {Promise} Promise for count
     */
    countOperationReports() {
      return this.OperationReport.count();
    }

    /**
     * List operation reports by type
     * 
     * @param {String} type type
     * @returns {Promise} Promise for count
     */
    countOperationReportsByType(type) {
      return this.OperationReport.count({ where: { type: type }});
    }

    // OperationReportItem
    
    /**
     * Create operation report item
     * 
     * @param {Integer} operationReportId operationReportId
     * @param {String} message message
     * @param {Boolean} completed completed
     * @param {Boolean} success success
     * @returns {Promise} Promise for OperationReportItem
     */
    createOperationReportItem(operationReportId, message, completed, success) {
      return this.OperationReportItem.create({
        operationReportId: operationReportId,
        message: message,
        completed: completed,
        success: success
      });
    }

    /**
     * List operation report items by operationReportId
     * 
     * @param {int} operationReportId operationReportId
     * @returns {Promise} Promise for OperationReportItems
     */
    listOperationReportItemsByOperationReportId(operationReportId) {
      return this.OperationReportItem.findAll({ where: { operationReportId: operationReportId } });
    }

    /**
     * Count operation report items by operationReportId and completed
     * 
     * @param {int} operationReportId operationReportId
     * @param {Boolean} completed completed
     * @returns {Promise} Promise for OperationReportItems count
     */
    countOperationReportItemsByOperationIdCompleted(operationReportId, completed) {
      return this.OperationReportItem.count({ where: { operationReportId: operationReportId, completed: completed } });
    }

    /**
     * Count operation report items by operationReportId, completed and success
     * 
     * @param {int} operationReportId operationReportId
     * @param {Boolean} completed completed
     * @param {Boolean} success success
     * @returns {Promise} Promise for OperationReportItems count
     */
    countOperationReportItemsByOperationIdCompletedAndSuccess(operationReportId, completed, success) {
      return this.OperationReportItem.count({ where: { operationReportId: operationReportId, completed: completed, success: success } });
    }

    /**
     * Updates operation report item
     * 
     * @param {int} id id
     * @param {String} message message
     * @param {Boolean} completed completed
     * @param {Boolean} success success
     * @returns {Promise} Promise for ContractDocument
     */
    updateOperationReportItem(id, message, completed, success) {
      return this.OperationReportItem.update({
        message: message,
        completed: completed,
        success: success
      }, {
        where: {
          id: id
        }
      });
    }
    
    /**
     * Create thread predefined text
     * 
     * @param {Integer} threadId thread id
     * @param {String} text text
     * @returns {Promise} Promise for created entity
     */
    createThreadPredefinedText(threadId, text) {
      return this.ThreadPredefinedText.create({
        threadId: threadId,
        text: text
      });
    }

    /**
     * Find ThreadPredefinedTexts
     * 
     * @param {int} id
     * @returns {Promise} Promise for ThreadPredefinedText
     */
    findThreadPredefinedTexts(id) {
      return this.ThreadPredefinedText.findOne({
        where: {
          id: id
        }
      });
    }

    /**
     * List ThreadPredefinedTexts
     * 
     * @param {int} threadId thread id
     * @returns {Promise} Promise for ThreadPredefinedTexts
     */
    listThreadPredefinedTextsByThreadId(threadId) {
      return this.ThreadPredefinedText.findAll({
        where: {
          threadId: threadId
        }
      });
    }

    /**
     * Updates ThreadPredefinedText 
     * 
     * @param {int} id id
     * @param {string} text text 
     */
    updateThreadPredefinedText(id, text) {
      return this.ThreadPredefinedText.update({
        text: text
      }, {
        where: {
          id: id
        }
      });
    }

    /**
     * Deletes predefined text from thread 
     * 
     * @param {int} threadId thread id
     * @return {Promise} promise that resolves on successful removal
     */
    deleteThreadPredefinedTextByThreadIdAndText(threadId, text) {
      return this.ThreadPredefinedText.destroy({ 
        where: { 
          threadId: threadId,
          text: text 
        } 
      });
    }

  }
  
  module.exports = (options, imports, register) => {
    const shadySequelize = imports["shady-sequelize"];
    const logger = imports["logger"];
    const models = new Models(logger, shadySequelize);

    models.migrationsUp().then((migrations) => {
      migrations.forEach((migration) => {
        logger.info(`Migration ${migration.file} executed successfully`);
      });

      models.defineModels();

      register(null, {
        "pakkasmarja-berries-models": models
      });
    });
    
  };
  
})();