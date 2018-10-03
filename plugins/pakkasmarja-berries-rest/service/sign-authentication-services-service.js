/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';

  const AbstractService = require(`${__dirname}/../abstract-service`);

  /**
   * Abstract base class for SignAuthenticationServices REST service
   */
  class AbstractSignAuthenticationServicesService extends AbstractService {

   /**
    * List sign authentication services
    * List available sign authentication services
    *
    * @param {http.ClientRequest} req client request object
    * @param {http.ServerResponse} res server response object
    **/
    listSignAuthenticationServices(req, res) {
      res.status(501).send();
    }

   /**
    * Registers REST routes
    *
    * @param app express object
    **/
    register(app, keycloak) {
      app.get(`/rest/v1${this.toPath('/signAuthenticationServices')}`, [ keycloak.protect() ], this.catchAsync(this.listSignAuthenticationServices.bind(this)));
    }
  };

  module.exports = AbstractSignAuthenticationServicesService;

})();

