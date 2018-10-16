/*jshint esversion: 6 */
/* global __dirname */

(() => {
  "use strict";

  const Promise = require('bluebird');
  const NotFound = require(`${__dirname}/model/not-found`);
  const BadRequest = require(`${__dirname}/model/bad-request`);
  const InternalServerError = require(`${__dirname}/model/internal-server-error`);
  const NotImplemented = require(`${__dirname}/model/not-implemented`);
  const Forbidden = require(`${__dirname}/model/forbidden`);

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
     * Gets accesstoken from request
     * 
     * @param {object} req express request
     * @returns access token
     */
    getAccessToken(req) {
      const kauth = req.kauth;
      if (kauth && kauth.grant && kauth.grant.access_token) {
        return kauth.grant.access_token;
      }
      
      return null;   
    }

    /**
     * Gets user id from request
     * 
     * @param {object} req express request
     * @returns user id
     */
    getLoggedUserId(req) {
      const accessToken = this.getAccessToken(req);
      return accessToken && accessToken.content ? accessToken.content.sub : null;
    }

    /**
     * Returns whether user has specified realm role or not 
     * 
     * @param {object} req express request
     * @param {String} role realm role 
     */
    hasRealmRole(req, role) {
      const accessToken = this.getAccessToken(req);
      return accessToken.hasRealmRole(role);
    }
    
    /**
     * Catch unhandled promise errors
     * 
     * @param {function} handler handler function
     * @return {Function} decorated handler function
     */
    catchAsync(handler) {
      return (req, res) => {
        try {
          return Promise.resolve(handler(req, res)).catch((err) => {
            console.error(err);
            res.status(500).send(err);
          });
        } catch (e) {
          console.error(e);
        }
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
        "message": message || "Bad Request"
      }));
    }
   
    /**
     * Responds with 403 - forbidden
     * 
     * @param {http.ServerResponse} res server response object
     * @param {String} message (optional)
     */
    sendForbidden(res, message) {
      res.status(403).send(Forbidden.constructFromObject({
        "code": 403,
        "message": message || "Forbidden"
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
        "message": message || "Bad Request"
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
        "message": message || "Not implemented yet"
      }));
    }

    /**
     * Returns content type without parameters
     */
    getBareContentType(contentType) {
      if (!contentType) {
        return null;
      }

      return contentType.split(";")[0].trim();
    }

  }

  module.exports = AbstractService;

})();

