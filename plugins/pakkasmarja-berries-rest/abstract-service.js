/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';

  const Promise = require('bluebird');
  const NotFound = require(`${__dirname}/model/not-found`);
  const BadRequest = require(`${__dirname}/model/bad-request`);
  const InternalServerError = require(`${__dirname}/model/internal-server-error`);
  const NotImplemented = require(`${__dirname}/model/not-implemented`);

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
     * Catch unhandled promise errors
     * 
     * @param {function} handler handler function
     * @return {Function} decorated handler function
     */
    catchAsync(handler) {
      return (req, res) => {
        return Promise.resolve(handler(req, res)).catch((err) => {
          res.status(500).send(err);
        });
      };
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
   
    /**
     * Responds with 400 - bad request
     * 
     * @param {http.ServerResponse} res server response object
     * @param {String} message (optional)
     */
    sendBadRequest(res, message) {
      res.status(400).send(BadRequest.constructFromObject({
        "code": 400,
        "message": message || "Bad Request"
      }));
    }
    
    /**
     * Responds with 500 - internal server error
     * 
     * @param {http.ServerResponse} res server response object
     * @param {String} message (optional)
     */
    sendInternalServerError(res, message) {
      res.status(500).send(InternalServerError.constructFromObject({
        "code": 500,
        "message": message || "Bad Request"
      }));
    }
    
    
    /**
     * Responds with 501 - not implemented
     * 
     * @param {http.ServerResponse} res server response object
     * @param {String} message (optional)
     */
    sendNotImplemented(res, message) {
      res.status(501).send(NotImplemented.constructFromObject({
        "code": 501,
        "message": message || "Not implemented yet"
      }));
    }
   
  }

  module.exports = AbstractService;

})();

