/*jshint esversion: 6 */
/* global __dirname */

(() => {
  "use strict";
  
  const ContactsServiceImpl = require(`${__dirname}/impl/contacts-service`);
  const ContractsServiceImpl = require(`${__dirname}/impl/contracts-service`);
  const ItemGroupsServiceImpl = require(`${__dirname}/impl/item-groups-service`);
  const DeliveryPlacesServiceImpl = require(`${__dirname}/impl/delivery-places-service`);
  const OperationReportsServiceImpl = require(`${__dirname}/impl/operation-reports-service`);
  const OperationsServiceImpl = require(`${__dirname}/impl/operations-service`);
  const SignAuthenticationServicesServiceImpl = require(`${__dirname}/impl/sign-authentication-services-service`);
  
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
     * @param {Object} xlsx Excel rendering functionalities
     * @param {Object} signature signature functionalities
     * @param {Object} tasks task queue functionalities
     * @param {Object} mailer mailer instance
     */
    constructor (logger, models, userManagement, pdf, xlsx, signature, tasks, mailer, pushNotifications) {
      this.contactsService = new ContactsServiceImpl(logger, models, userManagement, mailer);
      this.contractsService = new ContractsServiceImpl(logger, models, userManagement, pdf, xlsx, signature, tasks, pushNotifications);
      this.itemGroupsService = new ItemGroupsServiceImpl(logger, models);
      this.deliveryPlacesService = new DeliveryPlacesServiceImpl(logger, models);
      this.operationReportsService = new OperationReportsServiceImpl(logger, models);
      this.operationsService = new OperationsServiceImpl(logger, models, tasks);
      this.signAuthenticationService = new SignAuthenticationServicesServiceImpl(logger, signature);
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
      this.deliveryPlacesService.register(app, keycloak);
      this.operationReportsService.register(app, keycloak);
      this.operationsService.register(app, keycloak);
      this.signAuthenticationService.register(app, keycloak);
    }
    
  }

  module.exports = (options, imports, register) => {
    const logger = imports["logger"];
    const models = imports["pakkasmarja-berries-models"];
    const userManagement = imports["pakkasmarja-berries-user-management"];
    const pdf = imports["pakkasmarja-berries-pdf"];
    const xlsx = imports["pakkasmarja-berries-xlsx"];
    const signature = imports["pakkasmarja-berries-signature"];
    const tasks = imports["pakkasmarja-berries-tasks"];
    const mailer = imports["pakkasmarja-berries-mailer"];
    const pushNotifications = imports['pakkasmarja-berries-push-notifications'];
    
    const restServices = new RestServices(logger, models, userManagement, pdf, xlsx, signature, tasks, mailer, pushNotifications);
    register(null, {
      "pakkasmarja-berries-rest": restServices
    });
  };

})();
