/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';

  const AbstractService = require(`${__dirname}/../abstract-service`);

  /**
   * Abstract base class for Operations REST service
   */
  class AbstractOperationsService extends AbstractService {

   /**
    * Creates new operation
    * Creates new operation
    *
    * @param {http.ClientRequest} req client request object
    * @param {http.ServerResponse} res server response object
    **/
    createOperation(req, res) {
      res.status(501).send();
    }

   /**
    * Registers REST routes
    *
    * @param app express object
    **/
    register(app, keycloak) {
      app.post(`/rest/v1${this.toPath('/operations')}`, [ keycloak.protect() ], this.catchAsync(this.createOperation.bind(this)));
    }
  };

  module.exports = AbstractOperationsService;

})();

