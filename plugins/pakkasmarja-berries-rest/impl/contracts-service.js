/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';

  const Promise = require('bluebird');
  const _ = require('lodash');
  const Mustache = require('mustache');
  const AbstractContractsService = require(`${__dirname}/../service/contracts-service`);
  const Contract = require(`${__dirname}/../model/contract`);

  /**
   * Implementation for Contracts REST service
   */
  class ContractsServiceImpl extends AbstractContractsService {
    /**
     * Constructor for Contracts service
     * 
     * @param {Object} logger logger
     * @param {Object} models models
     * @param {Object} userManagement userManagement
     */
    constructor (logger, models, userManagement) {
      super();
      
      this.logger = logger;
      this.models = models;
      this.userManagement = userManagement;
    }
    
    /* jshint ignore:start */
    async findContract(req, res) {
      const contractId = req.params.id;
      if (!contractId) {
        this.sendNotFound(res);
        return;
      }
      
      const databaseContract = await this.models.findContractByExternalId(contractId);
      if (!databaseContract) {
        this.sendNotFound(res);
        return;
      }
      
      res.status(200).send(await this.translateDatabaseContract(databaseContract));
    }
    /* jshint ignore:end */
    
    /**
     * @inheritdoc
     */
    /* jshint ignore:start */
    async getContractDocument(req, res) {
      const contractId = req.params.id;
      const type = req.params.type;
      const format = req.query.format;
      
      if (!contractId || !type) {
        this.sendNotFound(res);
        return;
      }
      
      if (!format) {
        this.sendBadRequest(res, "Missing request parameter format");
        return;
      }
      
      const contract = await this.models.findContractByExternalId(contractId);
      if (!contract) {
        this.sendNotFound(res);
        return;
      }
      
      const contractDocumentTemplate = await this.models.findContractDocumentTemplateByTypeAndContractId(type, contract.id);
      if (!contractDocumentTemplate) {
        this.sendNotFound(res);
        return;
      }
      
      const documentTemplate = await this.models.findDocumentTemplateById(contractDocumentTemplate.documentTemplateId);
      if (!documentTemplate) {
        this.sendNotFound(res);
        return;
      }
      
      const user = await this.userManagement.findUser(contract.userId);
      if (!user) {
        this.sendNotFound(res);
        return;
      }
      
      const data = {
        companyName: this.userManagement.getSingleAttribute(user, this.userManagement.ATTRIBUTE_COMPANY_NAME)
      };
      
      const html = Mustache.render(documentTemplate.contents, data);
      if (!html) {
        this.sendNotFound(res);
        return;
      }
      
      switch (format) {
        case 'HTML':
         res.status(200).send(html);
        break;
      }
      
    }
    /* jshint ignore:end */
    
    /**
     * @inheritdoc
     */
    /* jshint ignore:start */
    async listContracts(req, res) {
      const databaseContracts = await this.models.listContracts();
      const contracts = await Promise.all(databaseContracts.map((databaseContract) => {
        return this.translateDatabaseContract(databaseContract);
      }));
      
      res.status(200).send(contracts);
    }
    /* jshint ignore:end */
    
    /**
     * Translates Database contract into REST entity
     * 
     * @param {Object} contract Sequelize contract model
     * @return {Contract} REST entity
     */
    /* jshint ignore:start */
    async translateDatabaseContract(contract) {
      const itemGroup = await this.models.findItemGroupById(contract.itemGroupId);
      
      return Contract.constructFromObject({
        'id': contract.externalId,
        'itemGroupId': itemGroup.externalId,
        'quantity': contract.quantity,
        'startDate': contract.startDate,
        'endDate': contract.endDate,
        'signDate': contract.signDate,
        'termDate': contract.termDate,
        'status': contract.status,
        'remarks': contract.remarks
      });
      
    }
    /* jshint ignore:end */
  }

  module.exports = ContractsServiceImpl;

})();

