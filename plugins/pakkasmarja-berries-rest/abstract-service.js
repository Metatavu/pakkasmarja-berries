/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';

  const NotFound = require(`${__dirname}/model/not-found`);

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
    
    /**
     * Converts swagger path into a route path
     * 
     * @param {String} path swagger path
     * @return {String} route path
     */
    toPath(path) {
      return path.replace(/\{(.*?)\}/g, (match, param) => { 
        return `:${param}`;
      });
    }
   
    /**
     * Responds with 404 - not found
     * 
     * @param {http.ServerResponse} res server response object
     */
    sendNotFound(res) {
      res.status(404).send(NotFound.constructFromObject({
        "code": 404,
        "message": "Not found"
      }));
    }
   
  }

  module.exports = AbstractService;

})();

