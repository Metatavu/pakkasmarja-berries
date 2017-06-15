/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';
  
  const util = require('util'); 
  const moment = require('moment');
  const uuid = require('uuid4');
  
  class PakkasmarjaBerriesClusterMessages {
    
    constructor (logger, pakkasmarjaBerriesModels) {
      this.logger = logger;
      this.pakkasmarjaBerriesModels = pakkasmarjaBerriesModels;
    }
    
    register(shadyMessages) {
    
    }
    
  };

  module.exports = (options, imports, register) => {
    const logger = imports['logger'];
    const pakkasmarjaBerriesModels = imports['pakkasmarja-berries-models'];
    const pakkasmarjaBerriesClusterMessages = new PakkasmarjaBerriesClusterMessages(logger, pakkasmarjaBerriesModels);
    register(null, {
      'pakkasmarja-berries-cluster-messages': pakkasmarjaBerriesClusterMessages
    });
  };

})();
