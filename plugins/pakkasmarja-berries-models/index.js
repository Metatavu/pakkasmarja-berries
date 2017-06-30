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
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        userId: { type: Sequelize.STRING, allowNull: false, validate: { isUUID: 4 } }
      });
      
      this.defineModel('Thread', {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        title: { type: Sequelize.STRING },
        type: { type: Sequelize.STRING, allowNull: false },
        originId: { type: Sequelize.STRING },
        imageUrl: { type: Sequelize.STRING, validate: { isUrl: true } }
      });
      
      this.defineModel('ThreadUserGroupRole', {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        threadId: { type: Sequelize.BIGINT, allowNull: false, references: { model: this.Thread, key: 'id' } },
        userGroupId: { type: Sequelize.STRING, allowNull: false, validate: { isUUID: 4 }  },
        role: { type: Sequelize.STRING, allowNull: false  }
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
        userId: { type: Sequelize.STRING, allowNull: false, validate: { isUUID: 4 } },
        contents: { type: Sequelize.TEXT, allowNull: false }
      });
      
      this.defineModel('QuestionGroup', {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        title: { type: Sequelize.STRING, allowNull: false },
        originId: { type: Sequelize.STRING, allowNull: false },
        imageUrl: { type: Sequelize.STRING, validate: { isUrl: true } }
      });
      
      this.defineModel('QuestionGroupUserGroupRole', {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        questionGroupId: { type: Sequelize.BIGINT, allowNull: false, references: { model: this.QuestionGroup, key: 'id' } },
        userGroupId: { type: Sequelize.STRING, allowNull: false, validate: { isUUID: 4 }  },
        role: { type: Sequelize.STRING, allowNull: false  }
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
        userId: { type: Sequelize.STRING, allowNull: false, validate: { isUUID: 4 } }
      }, {
        indexes: [{
          name: 'UN_QUESTIONGROUPUSERTHREAD_QUESTIONGROUPID_THREADID',
          unique: true,
          fields: ['questionGroupId', 'threadId']
        }]
      });
      
      this.defineModel('NewsArticle', {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        title: { type: Sequelize.STRING, allowNull: false },
        contents: { type: Sequelize.TEXT, allowNull: false },
        originId: { type: Sequelize.STRING, allowNull: false },
        imageUrl: { type: Sequelize.STRING, validate: { isUrl: true } }
      });
      
      this.defineModel('MessageAttachment', {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        messageId: { type: Sequelize.BIGINT, allowNull: false, references: { model: this.Message, key: 'id' } },
        contents: { type: Sequelize.BLOB, allowNull: false },
        contentType: { type: Sequelize.STRING, allowNull: false },
        fileName: { type: Sequelize.STRING },
        size: { type: Sequelize.BIGINT }
      });
      
      this.defineModel('ItemRead', {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        userId: { type: Sequelize.STRING, allowNull: false, validate: { isUUID: 4 } },
        itemId: { type: Sequelize.STRING, allowNull: false }
      }, {
        indexes: [{
          name: 'UN_ITEMREAD_USERID_ITEMID',
          unique: true,
          fields: ['userId', 'itemId']
        }]
      });
    }
    
    defineModel(name, attributes, options) {
      this[name] = this.sequelize.define(name, attributes, options);
      this.modelNames.push(name);
    }
    
    // Sessions
    
    findSession(id) {
      return this.Session.findOne({ where: { id : id } });
    }
    
    createSession(userId) {
      return this.sequelize.sync()
        .then(() => this.Session.create({
          userId: userId
      }));
    }
    
    // Threads
            
    createThread(originId, title, type, imageUrl) {
      return this.sequelize.sync()
        .then(() => this.Thread.create({
          originId: originId,
          title: title,
          type: type,
          imageUrl: imageUrl
      }));
    }
    
    findThread(id) {
      return this.Thread.findOne({ where: { id : id } });
    }
    
    findThreadByOriginId(originId) {
      return this.Thread.findOne({ where: { originId : originId } });
    }
    
    listConversationThreadsByUserGroupId(userGroupId) {
      return this.ThreadUserGroupRole.findAll({ where: { userGroupId: userGroupId } })
        .then((threadUserGroupRoles) => {
          return this.Thread.findAll({ where: { 
            id: {$in: _.map(threadUserGroupRoles, 'threadId') }
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
      return this.listQuestionGroupUserGroupRolesByQuestionGroupId(questionGroupId)
        .then((questionGroupUserGroupRoles) => {
          const result = [];

          _.forEach(questionGroupUserGroupRoles, (questionGroupUserGroupRole) => {
            if (questionGroupUserGroupRole.role === 'manager') {
              
            }
            result.push(questionGroupUserGroupRole.userGroupId);
          });

          return result;
        });
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
                  return listQuestionGroupUserGroupIds(questionGroup.id);
                });
            }
          }
        });
    }
    
    listThreadUserGroupRolesByThreadId(threadId) {
      return this.ThreadUserGroupRole.findAll({ where: { threadId : threadId } });
    }
    
    updateThread(id, title, imageUrl) {
      return this.Thread.update({
        title: title,
        imageUrl: imageUrl
      }, {
        where: {
          id: id
        }
      });
    }
    
    setThreadUserGroupRoles(threadId, roleMap) {
      const createPromises = _.map(roleMap, (role, userGroupId) => {
        return this.ThreadUserGroupRole.create({
            threadId: threadId,
            userGroupId: userGroupId,
            role: role
        });
      });
      
      return this.ThreadUserGroupRole.destroy({ where: { threadId : threadId } })
        .then(() => {
          return this.sequelize.sync()
            .then(() => { 
              return Promise.all(createPromises);
            });
        });
    }
    
    // Messages
    
    createMessage(threadId, userId, contents) {
      return this.sequelize.sync()
        .then(() => this.Message.create({
          threadId: threadId,
          userId: userId,
          contents: contents
      }));
    }
    
    findMessage(id) {
      return this.Message.findOne({ where: { id : id } });
    }
    
    listMessagesByThreadId(threadId, firstResult, maxResults) {
      if (!threadId) {
        return Promise.resolve([]);
      }
      
      return this.Message.findAll({ where: { threadId : threadId }, offset: firstResult, limit: maxResults });
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
    
    getLatestMessageCreatedByThreadIds() {
      
    }
  
    // QuestionGroup
      
    createQuestionGroup(originId, title, imageUrl) {
      return this.sequelize.sync()
        .then(() => this.QuestionGroup.create({
          title: title,
          originId: originId,
          imageUrl: imageUrl
      }));
    }
    
    findQuestionGroup(id) {
      return this.QuestionGroup.findOne({ where: { id : id } });
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
            id: {$in: _.map(questionGroupUserGroupRoles, 'questionGroupId') }
          }});
        });
    }
    
    updateQuestionGroup(id, title, imageUrl) {
      return this.QuestionGroup.update({
        title: title,
        imageUrl: imageUrl
      }, {
        where: {
          id: id
        }
      });
    }
    
    setQuestionGroupUserGroupRoles(questionGroupId, roleMap) {
      const createPromises = _.map(roleMap, (role, userGroupId) => {
        return this.QuestionGroupUserGroupRole.create({
            questionGroupId: questionGroupId,
            userGroupId: userGroupId,
            role: role
        });
      });
      
      return this.QuestionGroupUserGroupRole.destroy({ where: { questionGroupId : questionGroupId } })
        .then(() => {
          return this.sequelize.sync()
            .then(() => {
              return Promise.all(createPromises);          
            });
        });
    }
    
    // QuestionGroupUserThreads
    
    createQuestionGroupUserThread(questionGroupId, threadId, userId) {
      return this.sequelize.sync()
        .then(() => this.QuestionGroupUserThread.create({
          threadId: threadId,
          questionGroupId: questionGroupId,
          userId: userId
      }));
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
      return this.sequelize.sync()
        .then(() => this.NewsArticle.create({
          title: title,
          contents: contents,
          originId: originId,
          imageUrl: imageUrl
      }));
    }
    
    findNewsArticle(id) {
      return this.NewsArticle.findOne({ where: { id : id } });
    }
    
    findNewsArticleByOriginId(originId) {
      return this.NewsArticle.findOne({ where: { originId : originId } });
    }
    
    listNewsArticles(firstResult, maxResults) {
      return this.NewsArticle.findAll({ offset: firstResult, limit: maxResults });
    }
    
    updateNewsArticle(id, title, contents, imageUrl) {
      return this.NewsArticle.update({
        title: title,
        contents: contents,
        imageUrl: imageUrl
      }, {
        where: {
          id: id
        }
      });
    }
    
    // MessageAttachment
    
    createMessageAttachment(messageId, contents, contentType, fileName, size) {
      return this.sequelize.sync()
        .then(() => this.MessageAttachment.create({
          messageId: messageId,
          contents: contents,
          contentType: contentType,
          fileName: fileName,
          size: size
      }));
    }
    
    findMessageAttachments(id) {
      return this.MessageAttachment.findOne({ where: { id : id } });
    }
    
    createItemRead(userId, itemId) {
      return this.sequelize.sync()
        .then(() => this.ItemRead.create({
          itemId: itemId,
          userId: userId
      }));
    }
    
    findItemRead(userId, itemId) {
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
      return this.sequelize.sync()
        .then(() => this.QuestionGroupUserGroupRole.create({
          questionGroupId: questionGroupId, 
          userGroupId: userGroupId,
          role: role
      }));
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