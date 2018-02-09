/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';
  
  const ContactsServiceImpl = require(`${__dirname}/impl/contacts-service`);
  
  /**
   * Rest services
   */
  class RestServices {
    
    /**
     * Constructor for REST services
     * 
     * @param {Object} logger logger
     * @param {Object} models models
     * @param {Object} userManagement user management
     */
    constructor (logger, models, userManagement) {
      this.contactsService = new ContactsServiceImpl(logger, models, userManagement);
    }
    
    /**
     * Registers REST routes
     * 
     * @param {Object} express
     */
    register(app) {
      this.contactsService.register(app);
    }
    
  };

  module.exports = (options, imports, register) => {
    const logger = imports['logger'];
    const models = imports['pakkasmarja-berries-models'];
    const userManagement = imports['pakkasmarja-berries-user-management'];
    
    const restServices = new RestServices(logger, models, userManagement);
    register(null, {
      'pakkasmarja-berries-rest': restServices
    });
  };

})();
