/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';
  
  const util = require('util'); 
  const moment = require('moment');
  const uuid = require('uuid4');
  const _ = require('lodash');
  
  class PakkasmarjaBerriesClusterMessages {
    
    constructor (logger, models) {
      this.logger = logger;
      this.models = models;
    }
    
    onMessageAdded(event, data) {
      const userId = data.userId;
      const message = data.message;
      const clients = this.webSockets.getClients();
      
      _.forEach(clients, (client) => {
        const sessionId = client.getSessionId();
        if (sessionId) {
          this.models.findSession(this.models.toUuid(sessionId.toString()))
            .then((session) => {
              if (session.userId === userId) {
                client.sendMessage({
                  "type": "message-added",
                  "data": {
                    "id": message.id,
                    "content": message.content,
                    "userId": message.userId,
                    "threadId": message.threadId
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
    
    register(shadyMessages, webSockets) {
      this.webSockets = webSockets;
      shadyMessages.on("client:message-added", this.onMessageAdded.bind(this));
    }
    
  };

  module.exports = (options, imports, register) => {
    const logger = imports['logger'];
    const models = imports['pakkasmarja-berries-models'];
   
    const pakkasmarjaBerriesClusterMessages = new PakkasmarjaBerriesClusterMessages(logger, models);
    register(null, {
      'pakkasmarja-berries-cluster-messages': pakkasmarjaBerriesClusterMessages
    });
  };

})();
