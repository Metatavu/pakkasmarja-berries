/* jshint esversion: 6 */
/* global __dirname, Promise */
(() => {
  'use strict';
  
  const _ = require('lodash');
  const async = require('async');
  const util = require('util');
  const Promise = require('bluebird');
  
  class PakkasmarjaBerriesModels {
    
    constructor (models) {
      this._models = models;
      this._registeredModels = [];
      
      this._registerModel('Session', {
        fields: {
          id: "uuid",
          userId: "text",
          created: "timestamp"
        },
        key : ["id"]
      });
      
      this._registerModel('Message', {
        fields: {
          id: "uuid",
          threadId: "uuid",
          userId: "text",
          contents: "text",
          created: "timestamp",
          modified: "timestamp"
        },
        key : [ [ "threadId" ], "userId", "created" ],
        indexes: ["userId", "threadId" ],
        clustering_order: {"created": "desc"}
      });
      
      this._registerModel('Thread', {
        fields: {
          id: "uuid",
          title: "text",
          type: "text",
          originId: "text",
          imagePath: "text",
          userGroupRoles: {
            type: "map",
            typeDef: "<text,text>"
          }
        },
        key : [ [ "id" ]  ],
        indexes: ["type", "userGroupRoles", "originId" ]
      });
      
      this._registerModel('QuestionGroup', {
        fields: {
          id: "uuid",
          title: "text",
          originId: "text",
          imagePath: "text",
          userGroupRoles: {
            type: "map",
            typeDef: "<text,text>"
          },
          userThreads: {
            type: "map",
            typeDef: "<text,uuid>"
          }
        },
        key : [ [ "id" ]  ],
        indexes: [ "userGroupRoles", "originId" ]
      });
    }
    
    getModels() {
      return this._models;
    }
    
    getUuid() {
      return this.getModels().uuid();
    }
    
    toUuid(string) {
      return this.getModels().uuidFromString(string);
    }
    
    findSession(sessionId) {
      return this.instance.Session.findOneAsync({ id: sessionId });
    }
    
    createSession(sessionId, userId) {
      const session = new this.instance.Session({
        id: sessionId,
        created: new Date().getTime(),
        userId: userId
      });
      
      return session.saveAsync();
    }
    
    createMessage(messageId, threadId, userId, contents) {
      const created = new Date().getTime();
      
      return new this.instance.Message({
        id: messageId,
        threadId: threadId,
        userId: userId,
        contents: contents,
        created: created,
        modified: created
      }).saveAsync(); 
    }
    
    findMessage(messageId) {
      return this.instance.Message.findOneAsync({ id: messageId }, { allow_filtering: true });
    }
    
    listMessagesByThreadId(threadId, firstResult, maxResults) {
      if (!threadId) {
        return Promise.resolve([]);
      }
      
      return new Promise((resolve, reject) => {      
        // TODO: paging should be optimized

        const limit = (firstResult || 0) + (maxResults || 0);

        const query = {
          'threadId': threadId,
          '$limit': limit
        };
        
        this.instance.Message.findAsync(query)
          .then((messages) => {
            if (maxResults !== undefined) {
              resolve(messages.splice(firstResult));
            } else {
              resolve(messages);
            }
          })
          .catch(reject);
      });
    }
                
    createThread(threadId, originId, title, type, imageUrl, userGroupRoles) {
      return new this.instance.Thread({
        id: threadId,
        title: title,
        type: type,
        originId: originId,
        imageUrl: imageUrl,
        userGroupRoles: userGroupRoles
      }).saveAsync(); 
    }
    
    findThread(id) {
      return this.instance.Thread.findOneAsync({ id: id });
    }
    
    findThreadByOriginId(originId) {
      return this.instance.Thread.findOneAsync({ originId: originId });
    }
    
    listThreadsByUserGroupId(userGroupId) {
      return this.instance.Thread.findAsync({ userGroupRoles: { '$contains_key': userGroupId } }, { allow_filtering: true } );
    }
    
    listThreadsByTypeAndUserGroupId(type, userGroupId) {
      return this.instance.Thread.findAsync({ userGroupRoles: { '$contains_key': userGroupId }, type: type }, { allow_filtering: true });
    }
    
    updateThread(thread, title, imagePath, userGroupRoles) {
      thread.title = title;
      thread.imagePath = imagePath;
      thread.userGroupRoles = userGroupRoles;
      return thread.saveAsync(); 
    }
             
    createQuestionGroup(questionGroupId, originId, title, imageUrl, userGroupRoles) {
      return new this.instance.QuestionGroup({
        id: questionGroupId,
        title: title,
        originId: originId,
        imageUrl: imageUrl,
        userGroupRoles: userGroupRoles,
        userThreads: {}
      }).saveAsync(); 
    }
    
    findQuestionGroup(id) {
      return this.instance.QuestionGroup.findOneAsync({ id: id });
    }
    
    findQuestionGroupByOriginId(originId) {
      return this.instance.QuestionGroup.findOneAsync({ originId: originId });
    }
    
    listQuestionGroupsByUserGroupId(userGroupId) {
      return this.instance.QuestionGroup.findAsync({ userGroupRoles: { '$contains_key': userGroupId } }, { allow_filtering: true } );
    }
    
    updateQuestionGroup(questionGroup, title, imagePath, userGroupRoles) {
      questionGroup.title = title;
      questionGroup.imagePath = imagePath;
      questionGroup.userGroupRoles = userGroupRoles;
      return questionGroup.saveAsync(); 
    }
    
    findOrCreateQuestionGroupUserThread(questionGroup, userId) {
      const userThreads = questionGroup.userThreads || {};
      
      let threadId = userThreads[userId];
      if (threadId) {
        return this.findThread(threadId);
      } else {
        return new Promise((resolve, reject) => {
          threadId = this.getUuid();
          
          console.log("New thread", threadId);
          
          this.createThread(threadId, null, null, "question", null, null)
            .then(() => {
              const userThreadAdd = {};
              userThreadAdd[userId] = threadId;
              
              console.log("userThreadAdd", userThreadAdd);
              
              this.instance.QuestionGroup.updateAsync({ id:questionGroup.id }, { userThreads:{ '$add': userThreadAdd } })
                .then(() => {
                  this.findThread(threadId)
                    .then(resolve)
                    .catch(reject);
                })
                .catch(reject);
            })
            .catch(reject);
        });
      }
    }
    
    get instance() {
      return this.getModels().instance;
    }
    
    registerModels (callback) {
      async.parallel(this._createModelLoads(), (models) => {
        callback(models);
      });
    }
    
    _createModelLoads () {
      return _.map(this._registeredModels, (registeredModel) => {
        return (callback) => {
          this._models.loadSchema(registeredModel.modelName, registeredModel.modelSchema, callback);
        };
      });
    }
    
    _registerModel (modelName, modelSchema) {
      this._registeredModels.push({
        modelName: modelName,
        modelSchema: modelSchema
      });
    }
  } 
  
  module.exports = (options, imports, register) => {
    const cassandraModels = imports['shady-cassandra'];
    const pakkasmarjaBerriesModels = new PakkasmarjaBerriesModels(cassandraModels);
    
    pakkasmarjaBerriesModels.registerModels(() => {
        register(null, {
          'pakkasmarja-berries-models': pakkasmarjaBerriesModels
        });
      });
  };
  
})();