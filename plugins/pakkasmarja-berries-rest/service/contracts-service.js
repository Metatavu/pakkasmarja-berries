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
    * Registers REST routes
    *
    * @param app express object
    **/
    register(app, keycloak) {
      app.post(`/rest/v1${this.toPath('/contracts/{id}/documents/{type}/signRequests')}`, [ keycloak.protect() ], this.catchAsync(this.createContractDocumentSignRequest.bind(this)));
      app.get(`/rest/v1${this.toPath('/contracts/{id}')}`, [ keycloak.protect() ], this.catchAsync(this.findContract.bind(this)));
      app.get(`/rest/v1${this.toPath('/contracts/{id}/documents/{type}')}`, [ keycloak.protect() ], this.catchAsync(this.getContractDocument.bind(this)));
      app.get(`/rest/v1${this.toPath('/contracts')}`, [ keycloak.protect() ], this.catchAsync(this.listContracts.bind(this)));
      app.put(`/rest/v1${this.toPath('/contracts/{id}')}`, [ keycloak.protect() ], this.catchAsync(this.updateContract.bind(this)));
    }
  };

  module.exports = AbstractContractsService;

})();

