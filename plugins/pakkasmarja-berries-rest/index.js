/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';
  
  const ContactsServiceImpl = require(`${__dirname}/impl/contacts-service`);
  const ContractsServiceImpl = require(`${__dirname}/impl/contracts-service`);
  const ItemGroupsServiceImpl = require(`${__dirname}/impl/item-groups-service`);
  const OperationReportsServiceImpl = require(`${__dirname}/impl/operation-reports-service`);
  const OperationsServiceImpl = require(`${__dirname}/impl/operations-service`);
  
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
     * @param {Object} pdf PDF rendering functionalities
     * @param {Object} signature signature functionalities
     * @param {Object} tasks task queue functionalities
     */
    constructor (logger, models, userManagement, pdf, signature, tasks) {
      this.contactsService = new ContactsServiceImpl(logger, models, userManagement);
      this.contractsService = new ContractsServiceImpl(logger, models, userManagement, pdf, signature, tasks);
      this.itemGroupsService = new ItemGroupsServiceImpl(logger, models);
      this.operationReportsService = new OperationReportsServiceImpl(logger, models);
      this.operationsService = new OperationsServiceImpl(logger, models, tasks);
    }
    
    /**
     * Registers REST routes
     * 
     * @param {Object} express
     */
    register(app, keycloak) {
      this.contactsService.register(app, keycloak);
      this.contractsService.register(app, keycloak);
      this.itemGroupsService.register(app, keycloak);
      this.operationReportsService.register(app, keycloak);
      this.operationsService.register(app, keycloak);
    }
    
  }

  module.exports = (options, imports, register) => {
    /* jshint ignore:start */
    const logger = imports['logger'];
    const models = imports['pakkasmarja-berries-models'];
    const userManagement = imports['pakkasmarja-berries-user-management'];
    const pdf = imports['pakkasmarja-berries-pdf'];
    const signature = imports['pakkasmarja-berries-signature'];
    const tasks = imports['pakkasmarja-berries-tasks'];
    /* jshint ignore:end */
    
    const restServices = new RestServices(logger, models, userManagement, pdf, signature, tasks);
    register(null, {
      'pakkasmarja-berries-rest': restServices
    });
  };

})();
