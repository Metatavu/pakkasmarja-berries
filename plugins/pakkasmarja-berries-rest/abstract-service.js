/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';

  /**
   * Abstract base class for all REST services
   */
  class AbstractService {

    /**
     * REST route authentication middleware
     * 
     * @param {http.ClientRequest} req client request object
     * @param {http.ServerResponse} res server response object
     * @param {Function} next next callback
     */
    restAuth(req, res, next) {
      // TODO: Implement
      next();
    }
   
  };

  module.exports = AbstractService;

})();

