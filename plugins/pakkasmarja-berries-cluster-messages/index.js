/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';
  
  const util = require('util'); 
  const moment = require('moment');
  const config = require('nconf');
  const uuid = require('uuid4');
  const _ = require('lodash');
  
  class PakkasmarjaBerriesClusterMessages {
    
    constructor (logger, models, userManagement) {
      this.logger = logger;
      this.models = models;
      this.userManagement = userManagement;
    }
    
    onMessageAdded(event, data) {
      const userId = data['user-id'];
      const message = data['message'];
      const threadId = data['thread-id'];
      const threadType = data['thread-type'];
      
      const clients = this.webSockets.getClients();
      
      _.forEach(clients, (client) => {
        const sessionId = client.getSessionId();
        if (sessionId) {
          this.models.findSession(this.models.toUuid(sessionId.toString()))
            .then((session) => {
              if (session.userId === userId) {
                client.sendMessage({
                  "type": "messages-added",
                  "data": {
                    'messages': [ message ],
                    'thread-id': threadId,
                    'thread-type': threadType
                  }
                });
              }
            })
            .catch((err) => {
              this.logger.error(`Failed to load session ${sessionId}`, err);
            });
        }
      });
    }
    
    onConversationThreadAdded(event, data) {
      const userId = data['user-id'];
      const thread = data['thread'];
      const clients = this.webSockets.getClients();
      
      _.forEach(clients, (client) => {
        const sessionId = client.getSessionId();
        if (sessionId) {
          this.models.findSession(this.models.toUuid(sessionId.toString()))
            .then((session) => {
              if (session.userId === userId) {
                client.sendMessage({
                  "type": "conversation-threads-added",
                  "data": {
                    threads: [ thread ]
                  }
                });
              }
            })
            .catch((err) => {
              this.logger.error(`Failed to load session ${sessionId}`, err);
            });
        }
      });
    }
    
    onQuestionGroupAdded(event, data) {
      const userId = data['user-id'];
      const questionGroup = data['question-group'];
      const clients = this.webSockets.getClients();
      
      _.forEach(clients, (client) => {
        const sessionId = client.getSessionId();
        if (sessionId) {
          this.models.findSession(this.models.toUuid(sessionId.toString()))
            .then((session) => {
              
              if (session.userId === userId) {
                this.getUserGroupIds(userId)
                  .then((userGroupIds) => {
                    client.sendMessage({
                      "type": "question-groups-added",
                      "data": {
                        'question-groups': [ {
                          id: questionGroup.id,
                          title: questionGroup.title,
                          originId: questionGroup.originId,
                          latestMessage: questionGroup.latestMessage,
                          imagePath: questionGroup.imagePath,
                          role: this.getQuestionGroupRole(questionGroup, userGroupIds)
                        }]
                      }
                    });
                  })
                  .catch((err) => {
                    this.logger.error(`Failed to list userGroupIds for ${userId}`, err);
                  });
              }
            })
            .catch((err) => {
              this.logger.error(`Failed to load session ${sessionId}`, err);
            });
        }
      });
    }
    
    onQuestionGroupThreadAdded(event, data) {
      const userId = data['user-id'];
      const thread = data['thread'];
      const questionGroupId = data['question-group-id'];
      const clients = this.webSockets.getClients();
      
      _.forEach(clients, (client) => {
        const sessionId = client.getSessionId();
        if (sessionId) {
          this.models.findSession(this.models.toUuid(sessionId.toString()))
            .then((session) => {
              if (session.userId === userId) {
                client.sendMessage({
                  "type": "question-group-threads-added",
                  "data": {
                    'question-group-id': questionGroupId,
                    'threads': [ thread ]
                  }
                });
              }
            })
            .catch((err) => {
              this.logger.error(`Failed to load session ${sessionId}`, err);
            });
        }
      });
    }
    
    getQuestionGroupRole(questionGroup, userGroupIds) {
      return this.userManagement.getUserGroupRole(questionGroup.userGroupRoles, userGroupIds);
    }
    
    getUserGroupIds(userId) {
      return this.userManagement.listUserGroupIds(config.get('keycloak:realm'), userId);
    }
    
    register(shadyMessages, webSockets) {
      this.webSockets = webSockets;
      shadyMessages.on("client:message-added", this.onMessageAdded.bind(this));
      shadyMessages.on("client:conversation-thread-added", this.onConversationThreadAdded.bind(this));
      shadyMessages.on("client:question-group-added", this.onQuestionGroupAdded.bind(this));
      shadyMessages.on("client:question-group-thread-added", this.onQuestionGroupThreadAdded.bind(this));
    }
    
  };

  module.exports = (options, imports, register) => {
    const logger = imports['logger'];
    const models = imports['pakkasmarja-berries-models'];
    const userManagement = imports['pakkasmarja-berries-user-management'];
   
    const pakkasmarjaBerriesClusterMessages = new PakkasmarjaBerriesClusterMessages(logger, models, userManagement);
    register(null, {
      'pakkasmarja-berries-cluster-messages': pakkasmarjaBerriesClusterMessages
    });
  };

})();
