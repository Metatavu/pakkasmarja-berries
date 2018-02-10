/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';

  const AbstractSystemService = require(`${__dirname}/../service/system-service`);

  /**
   * Implementation for System REST service
   */
  class SystemServiceImpl extends AbstractSystemService {

   /**
    * Shutdown system
    * Shuts the system down
    *
    * @param {http.ClientRequest} req client request object
    * @param {http.ServerResponse} res server response object
    **/
    systemShutdown(req, res) {
      try {
        res.status(204).send();
      } finally {
        process.exit(0);
      }
    }

  };

  module.exports = SystemServiceImpl;

})();

