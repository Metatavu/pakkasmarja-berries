/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';

  const AbstractService = require(`${__dirname}/../abstract-service`);

  /**
   * Abstract base class for Contracts REST service
   */
  class AbstractContractsService extends AbstractService {

   /**
    * Requests contract document electronic signing
    * Requests contract document electronic signing
    *
    * @param {http.ClientRequest} req client request object
    * @param {http.ServerResponse} res server response object
    **/
    createContractDocumentSignRequest(req, res) {
      res.status(501).send();
    }

   /**
    * Create contract document template
    * Create new contract document template
    *
    * @param {http.ClientRequest} req client request object
    * @param {http.ServerResponse} res server response object
    **/
    createContractDocumentTemplate(req, res) {
      res.status(501).send();
    }

   /**
    * Find contract
    * Finds contract by id
    *
    * @param {http.ClientRequest} req client request object
    * @param {http.ServerResponse} res server response object
    **/
    findContract(req, res) {
      res.status(501).send();
    }

   /**
    * Find contract document template
    * Finds a contract templates
    *
    * @param {http.ClientRequest} req client request object
    * @param {http.ServerResponse} res server response object
    **/
    findContractDocumentTemplate(req, res) {
      res.status(501).send();
    }

   /**
    * Returns contract document
    * Returns contract document by type
    *
    * @param {http.ClientRequest} req client request object
    * @param {http.ServerResponse} res server response object
    **/
    getContractDocument(req, res) {
      res.status(501).send();
    }

   /**
    * List contract document templates
    * Lists contract templates
    *
    * @param {http.ClientRequest} req client request object
    * @param {http.ServerResponse} res server response object
    **/
    listContractDocumentTemplates(req, res) {
      res.status(501).send();
    }

   /**
    * Lists contracts
    * Lists contracts
    *
    * @param {http.ClientRequest} req client request object
    * @param {http.ServerResponse} res server response object
    **/
    listContracts(req, res) {
      res.status(501).send();
    }

   /**
    * Update contract
    * Updates single contract
    *
    * @param {http.ClientRequest} req client request object
    * @param {http.ServerResponse} res server response object
    **/
    updateContract(req, res) {
      res.status(501).send();
    }

   /**
    * Updates contract document template
    * Updates a contract templates
    *
    * @param {http.ClientRequest} req client request object
    * @param {http.ServerResponse} res server response object
    **/
    updateContractDocumentTemplate(req, res) {
      res.status(501).send();
    }

   /**
    * Registers REST routes
    *
    * @param app express object
    **/
    register(app, keycloak) {
      app.post(`/rest/v1${this.toPath('/contracts/{id}/documents/{type}/signRequests')}`, [ keycloak.protect() ], this.catchAsync(this.createContractDocumentSignRequest.bind(this)));
      app.post(`/rest/v1${this.toPath('/contracts/{contractId}/documentTemplates')}`, [ keycloak.protect() ], this.catchAsync(this.createContractDocumentTemplate.bind(this)));
      app.get(`/rest/v1${this.toPath('/contracts/{id}')}`, [ keycloak.protect() ], this.catchAsync(this.findContract.bind(this)));
      app.get(`/rest/v1${this.toPath('/contracts/{contractId}/documentTemplates/{contractDocumentTemplateId}')}`, [ keycloak.protect() ], this.catchAsync(this.findContractDocumentTemplate.bind(this)));
      app.get(`/rest/v1${this.toPath('/contracts/{id}/documents/{type}')}`, [ keycloak.protect() ], this.catchAsync(this.getContractDocument.bind(this)));
      app.get(`/rest/v1${this.toPath('/contracts/{contractId}/documentTemplates')}`, [ keycloak.protect() ], this.catchAsync(this.listContractDocumentTemplates.bind(this)));
      app.get(`/rest/v1${this.toPath('/contracts')}`, [ keycloak.protect() ], this.catchAsync(this.listContracts.bind(this)));
      app.put(`/rest/v1${this.toPath('/contracts/{id}')}`, [ keycloak.protect() ], this.catchAsync(this.updateContract.bind(this)));
      app.put(`/rest/v1${this.toPath('/contracts/{contractId}/documentTemplates/{contractDocumentTemplateId}')}`, [ keycloak.protect() ], this.catchAsync(this.updateContractDocumentTemplate.bind(this)));
    }
  };

  module.exports = AbstractContractsService;

})();

