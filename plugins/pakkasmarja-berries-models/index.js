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
          contents: "text"
        },
        key : [ [ "id" ] ],
        indexes: ["userId", "threadId" ]
      });
      
      this._registerModel('Thread', {
        fields: {
          id: "uuid",
          title: "text",
          type: "text",
          userGroupIds: {
            type: "set",
            typeDef: "<text>"
          }
        },
        key : [ [ "id" ]  ],
        indexes: ["type", "userGroupIds" ]
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
      return new this.instance.Message({
        id: messageId,
        threadId: threadId,
        userId: userId,
        contents: contents
      }).saveAsync(); 
    }
    
    listMessagesByThreadId(threadId) {
      if (!threadId) {
        return Promise.resolve([]);
      }
      
      return this.instance.Message.findAsync({ threadId: threadId }, { allow_filtering: true });
    }
    
    createThread(threadId, title, type, userGroupIds) {
      return new this.instance.Thread({
        id: threadId,
        title: title,
        type: type,
        userGroupIds: userGroupIds
      }).saveAsync(); 
    }
    
    findThread(id) {
      return this.instance.Thread.findOneAsync({ id: id });
    }
    
    listThreadsByUserGroupId(userGroupId) {
      return this.instance.Thread.findAsync({ userGroupIds: { $contains: userGroupId } });
    }
    
    listThreadsByTypeAndUserGroupId(type, userGroupId) {
      return this.instance.Thread.findAsync({ userGroupIds: { $contains: userGroupId }, type: type }, { allow_filtering: true });
    }
    
    addThreadUserGroupIds(threadId, userGroupIds) {
      return this.instance.Thread.updateAsync({ id: threadId}, { 
        userGroups: { '$append': userGroupIds }
      });
    }
    
    removeThreadUserGroupIds(threadId, userGroupIds) {
      return this.instance.Thread.updateAsync({ id: threadId}, { 
        userGroups: { '$remove': userGroupIds }
      });
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