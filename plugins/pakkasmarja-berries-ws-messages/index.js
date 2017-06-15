/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';
  
  const util = require('util'); 
  const moment = require('moment');
  const uuid = require('uuid4');
  
  class PakkasmarjaBerriesWebsocketMessages {
    
    constructor (logger, pakkasmarjaBerriesModels) {
      this.logger = logger;
      this.pakkasmarjaBerriesModels = pakkasmarjaBerriesModels;
    }
    
    handleWebSocketError(client, operation) {
      return (err) => {
        const failedOperation = operation || 'UNKNOWN_OPERATION';
        this.logger.error(util.format('ERROR DURING OPERATION %s: %s', failedOperation, err));      
        // TODO notify client
      };
    }
    
    onMessage(event) {
      const message = event.data.message;
      const client = event.client;

      switch (message.type) {
        case 'send-message':
          
        break;
        default:
          this.logger.error(util.format("Unknown message type %s", message.type));
        break;
      }
    }
    
    register(webSockets) {
      webSockets.on("message", this.onMessage.bind(this));
    }
    
  };

  module.exports = (options, imports, register) => {
    const logger = imports['logger'];
    const pakkasmarjaBerriesModels = imports['pakkasmarja-berries-models'];
    const websocketMessages = new PakkasmarjaBerriesWebsocketMessages(logger, pakkasmarjaBerriesModels);
    register(null, {
      'pakkasmarja-berries-ws-messages': websocketMessages
    });
  };

})();
