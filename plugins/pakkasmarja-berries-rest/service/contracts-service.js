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
    register(app) {
      app.get(`/rest/v1${this.toPath('/contracts/{id}')}`, [ this.restAuth.bind(this) ], this.catchAsync(this.findContract.bind(this)));
      app.get(`/rest/v1${this.toPath('/contracts')}`, [ this.restAuth.bind(this) ], this.catchAsync(this.listContracts.bind(this)));
      app.put(`/rest/v1${this.toPath('/contracts/{id}')}`, [ this.restAuth.bind(this) ], this.catchAsync(this.updateContract.bind(this)));
    }
  };

  module.exports = AbstractContractsService;

})();

