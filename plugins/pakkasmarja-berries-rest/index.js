/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';
  
  const ContactsServiceImpl = require(`${__dirname}/impl/contacts-service`);
  const ContractsServiceImpl = require(`${__dirname}/impl/contracts-service`);
  const ItemGroupsServiceImpl = require(`${__dirname}/impl/item-groups-service`);
  const SystemServiceImpl = require(`${__dirname}/impl/system-service`);
  
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
      this.systemService = new SystemServiceImpl();
      this.contractsService = new ContractsServiceImpl(logger, models);
      this.itemGroupsService = new ItemGroupsServiceImpl(logger, models);
    }
    
    /**
     * Registers REST routes
     * 
     * @param {Object} express
     */
    register(app, keycloak) {
      this.contactsService.register(app, keycloak);
      this.systemService.register(app, keycloak);
      this.contractsService.register(app, keycloak);
      this.itemGroupsService.register(app, keycloak);
    }
    
  }

  module.exports = (options, imports, register) => {
    /* jshint ignore:start */
    const logger = imports['logger'];
    const models = imports['pakkasmarja-berries-models'];
    const userManagement = imports['pakkasmarja-berries-user-management'];
    /* jshint ignore:end */
    
    const restServices = new RestServices(logger, models, userManagement);
    register(null, {
      'pakkasmarja-berries-rest': restServices
    });
  };

})();
