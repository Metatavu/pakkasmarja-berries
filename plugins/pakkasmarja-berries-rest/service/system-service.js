/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';

  const AbstractService = require(`${__dirname}/../abstract-service`);
  const config = require('nconf');
  
  /**
   * Abstract base class for System REST service
   */
  class AbstractSystemService extends AbstractService {

   /**
    * Shutdown system
    * Shuts the system down
    *
    * @param {http.ClientRequest} req client request object
    * @param {http.ServerResponse} res server response object
    **/
    systemShutdown(req, res) {
      res.status(501).send();
    }

   /**
    * Registers REST routes
    *
    * @param app express object
    **/
   
    register(app) {
      app.post('/rest/v1/system/shutdown', [ this.restAuth.bind(this) ], this.systemShutdown.bind(this));
    }
  };

  module.exports = AbstractSystemService;

})();

