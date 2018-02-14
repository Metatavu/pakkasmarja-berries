/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';

  const Promise = require('bluebird');
  const _ = require('lodash');
  const Mustache = require('mustache');
  const pug = require('pug');
  const path = require('path');
  const AbstractContractsService = require(`${__dirname}/../service/contracts-service`);
  const Contract = require(`${__dirname}/../model/contract`);
  
  const config = require('nconf');
  const wkhtmltopdf = require('wkhtmltopdf');
  wkhtmltopdf.command = config.get('wkhtmltopdf:command');
  
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
     * @param {Object} pdf PDF rendering functionalities
     */
    constructor (logger, models, userManagement, pdf) {
      super();
      
      this.logger = logger;
      this.models = models;
      this.userManagement = userManagement;
      this.pdf = pdf;
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
      const itemGroupDocumentTemplate = !contractDocumentTemplate ? await this.models.findItemGroupDocumentTemplateByTypeAndItemGroupId(type, contract.itemGroupId) : null;
      if (!contractDocumentTemplate && !itemGroupDocumentTemplate) {
        this.sendNotFound(res);
        return;
      }
      
      const documentTemplateId = contractDocumentTemplate ? contractDocumentTemplate.documentTemplateId : itemGroupDocumentTemplate.documentTemplateId;
      
      const documentTemplate = await this.models.findDocumentTemplateById(documentTemplateId);
      if (!documentTemplate) {
        this.sendNotFound(res);
        return;
      }
      
      const user = await this.userManagement.findUser(contract.userId);
      if (!user) {
        this.sendNotFound(res);
        return;
      }
      
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      
      const templateData = {
        companyName: this.userManagement.getSingleAttribute(user, this.userManagement.ATTRIBUTE_COMPANY_NAME)
      };
      
      const html = this.renderDocumentTemplateComponent(baseUrl, documentTemplate.contents, 'contract-document.pug', templateData);
      if (!html) {
        this.sendNotFound(res);
        return;
      }
      
      const header = this.renderDocumentTemplateComponent(baseUrl, documentTemplate.header, 'contract-header.pug', templateData);
      const footer = this.renderDocumentTemplateComponent(baseUrl, documentTemplate.footer, 'contract-footer.pug', templateData);
      
      switch (format) {
        case 'HTML':
         res.status(200).send(html);
        break;
        case 'PDF':
          this.pdf.renderPdf(html, header, footer, baseUrl)
            .then((pdfStream) => {
              res.setHeader("content-type", 'application/pdf');
              pdfStream.pipe(res);
            })
            .catch((err) => {
              this.logger.error(`PDF Rendering failed on ${err} html: ${html}, header: ${header}, footer: ${footer}`);
              this.sendInternalServerError(res, err);
            });
        break;
      }
      
    }
    /* jshint ignore:end */
    
    /**
     * Renders a document template component into HTML text
     * 
     * @param {String} base url
     * @param {String} mustacheTemplate mustache template
     * @param {String} pugTemplateName pug template name
     * @param {Object} mustacheData data passed to Mustache renderer
     * @return {String} rendered HTML
     */
    renderDocumentTemplateComponent(baseUrl, mustacheTemplate, pugTemplateName, mustacheData) {
      if (!mustacheTemplate) {
        return null;
      }
      
      return this.renderPugTemplate(pugTemplateName, {
        bodyContent: Mustache.render(mustacheTemplate, mustacheData),
        baseUrl: baseUrl
      });
    }
    
    /**
     * Renders a pug template
     * 
     * @param {String} template template name
     * @param {Object} model model
     * @return {String} rendered HTML
     */
    renderPugTemplate(template, model) {
      const compiledPug = pug.compileFile(`${__dirname}/../../../templates/${template}`);
      return compiledPug(model);
    }
    
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

