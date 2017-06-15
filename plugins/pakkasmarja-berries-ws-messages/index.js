/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';
  
  const util = require('util'); 
  const config = require('nconf');
  const moment = require('moment');
  const uuid = require('uuid4');
  
  class PakkasmarjaBerriesWebsocketMessages {
    
    constructor (logger, models, clusterMessages, userManagement) {
      this.logger = logger;
      this.models = models;
      this.clusterMessages = clusterMessages;
      this.userManagement = userManagement;
    }
    
    handleWebSocketError(client, operation) {
      return (err) => {
        const failedOperation = operation || 'UNKNOWN_OPERATION';
        this.logger.error(util.format('ERROR DURING OPERATION %s: %s', failedOperation, err));      
        // TODO notify client
      };
    }
    
    onSendMessage(message, client) {
      this.getUserId(client)
        .then((userId) => {
          // TODO: is user allowed to post the message?

          const threadId = this.models.toUuid(message.threadId);
          const contents = message.contents;

          this.models.findThread(threadId)
            .then((thread) => {
              const userGroupIds = thread.userGroupIds;
              this.userManagement.listGroupsMemberIds(config.get('keycloak:realm'), userGroupIds)
                .then((userIds) => {          
                  this.models.createMessage(this.models.getUuid(), threadId, userId, contents)
                    .then((message) => {
                      userIds.forEach((userId) => {
                        this.clusterMessages.trigger("client:message-added", {
                          "userId": userId,
                          "message": message
                        });
                      });
                    })
                    .catch(handleWebSocketError(client, 'SEND_MESSAGE'));            
                });
            })
            .catch(handleWebSocketError(client, 'SEND_MESSAGE'));

        })
        .catch(handleWebSocketError(client, 'SEND_MESSAGE'));
    }
    
    onMessage(event) {
      const message = event.data.message;
      const client = event.client;
      
      switch (message.type) {
        case 'send-message':
          this.onSendMessage(message, client);
        break;
        default:
          this.logger.error(util.format("Unknown message type %s", message.type));
        break;
      }
    }
    
    getUserId(client) {
      return new Promise((resolve, reject) => {
        this.models.findSession(this.models.toUuid(client.getSessionId()))
          .then((session) => {
            reject(session.userId);
          })
          .catch(reject);
      });
    }
    
    register(webSockets) {
      webSockets.on("message", this.onMessage.bind(this));
    }
    
  };

  module.exports = (options, imports, register) => {
    const logger = imports['logger'];
    const models = imports['pakkasmarja-berries-models'];
    const clusterMessages = imports['pakkasmarja-berries-cluster-messages'];
    const userManagement = imports['pakkasmarja-berries-user-management'];
    
    const websocketMessages = new PakkasmarjaBerriesWebsocketMessages(logger, models, clusterMessages, userManagement);
    register(null, {
      'pakkasmarja-berries-ws-messages': websocketMessages
    });
  };

})();
