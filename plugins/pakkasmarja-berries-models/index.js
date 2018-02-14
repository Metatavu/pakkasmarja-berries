/* jshint esversion: 6 */
/* global __dirname, Promise */
(() => {
  'use strict';
  
  const _ = require('lodash');
  const async = require('async');
  const util = require('util');
  const Promise = require('bluebird');
  
  class Models {
    
    constructor (logger, shadySequelize) {
      this.logger = logger;
      this.sequelize = shadySequelize.sequelize;
      this.Sequelize = shadySequelize.Sequelize;
      this.modelNames = [];
      this.defineModels();
    }
    
    defineModels() {
      const Sequelize = this.Sequelize;
      
      this.defineModel('Session', {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false, defaultValue: Sequelize.UUIDV4 },
        userId: { type: Sequelize.STRING(191), allowNull: false, validate: { isUUID: 4 } }
      });
      
      this.defineModel('ConnectSession', {
        sid: {
          type: Sequelize.STRING(191),
          primaryKey: true
        },
        userId: Sequelize.STRING(191),
        expires: Sequelize.DATE,
        data: Sequelize.TEXT
      });
      
      this.defineModel('UserSettings', {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        userId: { type: Sequelize.STRING(191), allowNull: false, validate: { isUUID: 4 } },
        settingKey: { type: Sequelize.STRING(191), allowNull: false },
        settingValue: { type: Sequelize.STRING(191) }
      }, {
        indexes: [{
          name: 'UN_USERSETTING_USERID_SETTINGKEY',
          unique: true,
          fields: ['userId', 'settingKey']
        }]
      });
      
      this.defineModel('Thread', {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        title: { type: Sequelize.STRING(191) },
        type: { type: Sequelize.STRING(191), allowNull: false },
        originId: { type: Sequelize.STRING(191) },
        imageUrl: { type: Sequelize.STRING(191), validate: { isUrl: true } },
        archived: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false}
      }, {
        hooks: {
          'afterFind': (object, options) => {
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
      
      this.defineModel('ThreadUserGroupRole', {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        threadId: { type: Sequelize.BIGINT, allowNull: false, references: { model: this.Thread, key: 'id' } },
        userGroupId: { type: Sequelize.STRING(191), allowNull: false, validate: { isUUID: 4 }  },
        role: { type: Sequelize.STRING(191), allowNull: false  }
      }, {
        indexes: [{
          name: 'UN_THREADUSERGROUPROLE_THREADID_USERGROUPID',
          unique: true,
          fields: ['threadId', 'userGroupId']
        }]
      });
      
      this.defineModel('Message', {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        threadId: { type: Sequelize.BIGINT, allowNull: false, references: { model: this.Thread, key: 'id' } },
        userId: { type: Sequelize.STRING(191), allowNull: false, validate: { isUUID: 4 } },
        contents: { type: Sequelize.TEXT, allowNull: false }
      });
      
      this.defineModel('QuestionGroup', {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        title: { type: Sequelize.STRING(191), allowNull: false },
        originId: { type: Sequelize.STRING(191), allowNull: false },
        imageUrl: { type: Sequelize.STRING(191), validate: { isUrl: true } },
        archived: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false}
      }, {
        hooks: {
          'afterFind': (object, options) => {
            if (!object) {
              return;  
            }
            
            const questionGroups = _.isArray(object) ? object : [ object ];
            
            const extendPromises = _.map(questionGroups, (questionGroup) => {
              return this.createQuestionGroupLatestMessagePromise(questionGroup);
            });
            
            return Promise.all(extendPromises);
          }
        }
      });
      
      this.defineModel('QuestionGroupUserGroupRole', {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        questionGroupId: { type: Sequelize.BIGINT, allowNull: false, references: { model: this.QuestionGroup, key: 'id' } },
        userGroupId: { type: Sequelize.STRING(191), allowNull: false, validate: { isUUID: 4 }  },
        role: { type: Sequelize.STRING(191), allowNull: false  }
      }, {
        indexes: [{
          name: 'UN_QUESTIONGROUPUSERGROUPROLE_QUESTIONGROUPID_USERGROUPID',
          unique: true,
          fields: ['questionGroupId', 'userGroupId']
        }]
      });
      
      this.defineModel('QuestionGroupUserThread', {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        questionGroupId: { type: Sequelize.BIGINT, allowNull: false, references: { model: this.QuestionGroup, key: 'id' } },
        threadId: { type: Sequelize.BIGINT, allowNull: false, references: { model: this.Thread, key: 'id' } },
        userId: { type: Sequelize.STRING(191), allowNull: false, validate: { isUUID: 4 } }
      }, {
        indexes: [{
          name: 'UN_QUESTIONGROUPUSERTHREAD_QUESTIONGROUPID_THREADID',
          unique: true,
          fields: ['questionGroupId', 'threadId']
        }]
      });
      
      this.defineModel('NewsArticle', {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        title: { type: Sequelize.STRING(191), allowNull: false },
        contents: { type: 'LONGTEXT', allowNull: false },
        originId: { type: Sequelize.STRING(191), allowNull: false },
        imageUrl: { type: Sequelize.STRING(191), validate: { isUrl: true } }
      });
      
      this.defineModel('MessageAttachment', {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        messageId: { type: Sequelize.BIGINT, allowNull: false, references: { model: this.Message, key: 'id' } },
        contents: { type: 'LONGBLOB', allowNull: false },
        contentType: { type: Sequelize.STRING(191), allowNull: false },
        fileName: { type: Sequelize.STRING(191) },
        size: { type: Sequelize.BIGINT }
      });
      
      this.defineModel('ItemRead', {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        userId: { type: Sequelize.STRING(191), allowNull: false, validate: { isUUID: 4 } },
        itemId: { type: Sequelize.STRING(191), allowNull: false }
      }, {
        indexes: [{
          name: 'UN_ITEMREAD_USERID_ITEMID',
          unique: true,
          fields: ['userId', 'itemId']
        }]
      });
      
      this.defineModel('ItemGroup', {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        externalId: { type: Sequelize.STRING(191), allowNull: false, validate: { isUUID: 4 } },
        name: { type: Sequelize.STRING(191), allowNull: false }
      }, {
        indexes: [{
          name: 'UN_ITEMGROUP_EXTERNAL_ID',
          unique: true,
          fields: ['externalId']
        }]
      });
      
      this.defineModel('Contract', {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        externalId: { type: Sequelize.STRING(191), allowNull: false, validate: { isUUID: 4 } },
        userId: { type: Sequelize.STRING(191), allowNull: false, validate: { isUUID: 4 } },
        itemGroupId: { type: Sequelize.BIGINT, allowNull: false, references: { model: this.ItemGroup, key: 'id' } },
        quantity: { type: Sequelize.BIGINT },
        startDate: Sequelize.DATE,
        endDate: Sequelize.DATE,
        signDate: Sequelize.DATE,
        termDate: Sequelize.DATE,
        status: { type: Sequelize.STRING(191), allowNull: false },
        remarks: Sequelize.TEXT
      }, {
        indexes: [{
          name: 'UN_CONTRACT_EXTERNAL_ID',
          unique: true,
          fields: ['externalId']
        }]
      });
      
      this.defineModel('DocumentTemplate', {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        contents: { type: 'LONGTEXT', allowNull: false },
        header: { type: 'LONGTEXT', allowNull: true },
        footer: { type: 'LONGTEXT', allowNull: true }
      });
      
      this.defineModel('ItemGroupDocumentTemplate', {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        type: { type: Sequelize.STRING(191), allowNull: false },
        itemGroupId: { type: Sequelize.BIGINT, allowNull: false, references: { model: this.ItemGroup, key: 'id' } },
        documentTemplateId: { type: Sequelize.BIGINT, allowNull: false, references: { model: this.DocumentTemplate, key: 'id' } }
      });
      
      this.defineModel('ContractDocumentTemplate', {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        type: { type: Sequelize.STRING(191), allowNull: false },
        contractId: { type: Sequelize.BIGINT, allowNull: false, references: { model: this.Contract, key: 'id' } },
        documentTemplateId: { type: Sequelize.BIGINT, allowNull: false, references: { model: this.DocumentTemplate, key: 'id' } }
      });
      
    }
    
    defineModel(name, attributes, options) {
      this[name] = this.sequelize.define(name, attributes, Object.assign(options || {}, {
        charset: 'utf8mb4',
        dialectOptions: {
          collate: 'utf8mb4_unicode_ci'
        }
      }));
      this[name].sync();
      this.modelNames.push(name);
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
    
    createThread(originId, title, type, imageUrl) {
      return this.Thread.create({
        originId: originId,
        title: title,
        type: type,
        imageUrl: imageUrl
      });
    }
    
    findThread(id) {
      return this.Thread.findOne({ where: { id : id } });
    }
    
    findThreadByOriginId(originId) {
      return this.Thread.findOne({ where: { originId : originId } });
    }
    
    findAllChatThreads() {
      return this.Thread.findAll({ where: { type: 'conversation', archived: false } });
    }
    
    listConversationThreadsByUserGroupId(userGroupId) {
      return this.ThreadUserGroupRole.findAll({ where: { userGroupId: userGroupId } })
        .then((threadUserGroupRoles) => {
          return this.Thread.findAll({ where: { 
            id: {$in: _.map(threadUserGroupRoles, 'threadId') },
            archived: false
          }});
        });
    }
    
    getThreadUserGroupRoleMap(threadId) {
      return this.findThread(threadId)
        .then((thread) => {
          if (thread.type === 'conversation') {
            return this.listThreadUserGroupRolesByThreadId(thread.id)
              .then((threadUserGroupRoles) => {
                const result = {};
        
                _.forEach(threadUserGroupRoles, (threadUserGroupRole) => {
                  result[threadUserGroupRole.userGroupId] = threadUserGroupRole.role;
                });
                
                return result;
              });
          } else if (thread.type === 'question') {
            return this.findQuestionGroupByThreadId(thread.id)
              .then((questionGroup) => {
                return this.getQuestionGroupUserGroupRoleMap(questionGroup.id);
              });
          }
        });
    }
    
    getQuestionGroupManagerUserGroupIds(questionGroupId) {
      return this.findQuestionGroupUserGroupRolesByquestionGroupIdAndRole(questionGroupId, 'manager')
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
    
    listThreadUserGroupIds(threadId) {
      return this.findThread(threadId)
        .then((thread) => {
          if (!thread) {
            this.logger.error("Thread not found");
            return [];
          } else {
            if (thread.type === 'conversation') {
              return this.listThreadUserGroupRolesByThreadId(thread.id)
                .then((threadUserGroupRole) => {
                  return _.map(threadUserGroupRole, 'userGroupId');
                });
            } else if (thread.type === 'question') {
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
    
    updateThread(id, title, imageUrl, silentUpdate) {
      return this.Thread.update({
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
      
      return this.Message.findAll({ where: { threadId : threadId }, offset: firstResult, limit: maxResults, order: [ [ 'createdAt', 'DESC' ] ] });
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
    
    getLatestMessageCreatedByThreadIds(threadIds) {
      return this.Message.max('createdAt', { where: { threadId: { $in: threadIds } } });
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
            id: {$in: _.map(questionGroupUserGroupRoles, 'questionGroupId') },
            archived: false
          }});
        });
    }
    
    listQuestionGroupsByUserGroupIdsAndRole(userGroupIds, role) {
      return this.QuestionGroupUserGroupRole.findAll({ where: {
          userGroupId: {$in: userGroupIds },
          role: role
        }})
        .then((questionGroupUserGroupRoles) => {
          return this.QuestionGroup.findAll({ where: { 
            id: {$in: _.map(questionGroupUserGroupRoles, 'questionGroupId') },
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
            return this.createThread(null, null, "question", null)
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
    
    listQuestionGroupUserGroupIds(questionGroupId) {
      return this.listQuestionGroupUserGroupRolesByQuestionGroupId(questionGroupId)
        .then((questionGroupUserGroupRole) => {
          return _.map(questionGroupUserGroupRole, 'userGroupId');
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
    
    createQuestionGroupLatestMessagePromise(questionGroup) {
      return this.listQuestionGroupUserThreadsByQuestionGroupId(questionGroup.id)
        .then((questionGroupUserThreads) => {
          const threadIds = _.map(questionGroupUserThreads, 'threadId');
          return this.getLatestMessageCreatedByThreadIds(threadIds).then((maxCreatedAt) => {
            questionGroup.latestMessage = maxCreatedAt;
          });
        });
    }
    
    // ItemGroups
    
    /**
     * new item group
     * 
     * @param {type} externalId externalId
     * @param {type} name name
     * @return {Promise} promise for created item group
     */
    createItemGroup(externalId, name) {
     return this.ItemGroup.create({
        externalId: externalId,
        name: name
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
     * Updates item group
     * 
     * @param {int} id item group id
     * @param {String} name name
     * @return {Promise} promise for updated item group
     */
    updateItemGroup(id, name) {
      return this.ItemGroup.update({
        name: name
      }, {
        where: {
          id: id
        }
      });
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
    
    // Contracts
    
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
     * Lists contracts
     * 
     * @param {int} firstResult first result
     * @param {int} maxResults max results
     * @return {Promise} promise for contracts
     */
    listContracts(firstResult, maxResults) {
      return this.Contract.findAll({ where: { }, offset: firstResult, limit: maxResults });
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
     * Finds a document template by id
     * 
     * @param {int} id document template id
     * @return {Promise} promise for document template
     */
    findDocumentTemplateById(id) {
      return this.DocumentTemplate.findOne({ where: { id : id } });
    }
    
    // ContractDocumentTemplate
      
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
    
  } 
  
  module.exports = (options, imports, register) => {
    const shadySequelize = imports['shady-sequelize'];
    const logger = imports['logger'];
    const models = new Models(logger, shadySequelize);
    
    register(null, {
      'pakkasmarja-berries-models': models
    });
    
  };
  
})();