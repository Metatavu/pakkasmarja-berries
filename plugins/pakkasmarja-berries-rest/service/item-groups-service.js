/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';

  const AbstractService = require(`${__dirname}/../abstract-service`);

  /**
   * Abstract base class for ItemGroups REST service
   */
  class AbstractItemGroupsService extends AbstractService {

   /**
    * Find item group
    * Finds item group by id
    *
    * @param {http.ClientRequest} req client request object
    * @param {http.ServerResponse} res server response object
    **/
    findItemGroup(req, res) {
      res.status(501).send();
    }

   /**
    * Find item group document template
    * Finds item group template
    *
    * @param {http.ClientRequest} req client request object
    * @param {http.ServerResponse} res server response object
    **/
    findItemGroupDocumentTemplate(req, res) {
      res.status(501).send();
    }

   /**
    * List item group document templates
    * Lists item group templates
    *
    * @param {http.ClientRequest} req client request object
    * @param {http.ServerResponse} res server response object
    **/
    listItemGroupDocumentTemplates(req, res) {
      res.status(501).send();
    }

   /**
    * Lists item groups
    * Lists item groups
    *
    * @param {http.ClientRequest} req client request object
    * @param {http.ServerResponse} res server response object
    **/
    listItemGroups(req, res) {
      res.status(501).send();
    }

   /**
    * Updates item group document template
    * Updated item group document template
    *
    * @param {http.ClientRequest} req client request object
    * @param {http.ServerResponse} res server response object
    **/
    updateItemGroupDocumentTemplate(req, res) {
      res.status(501).send();
    }

   /**
    * Registers REST routes
    *
    * @param app express object
    **/
    register(app, keycloak) {
      app.get(`/rest/v1${this.toPath('/itemGroups/{id}')}`, [ keycloak.protect() ], this.catchAsync(this.findItemGroup.bind(this)));
      app.get(`/rest/v1${this.toPath('/itemGroups/{itemGroupId}/documentTemplates/{id}')}`, [ keycloak.protect() ], this.catchAsync(this.findItemGroupDocumentTemplate.bind(this)));
      app.get(`/rest/v1${this.toPath('/itemGroups/{itemGroupId}/documentTemplates')}`, [ keycloak.protect() ], this.catchAsync(this.listItemGroupDocumentTemplates.bind(this)));
      app.get(`/rest/v1${this.toPath('/itemGroups')}`, [ keycloak.protect() ], this.catchAsync(this.listItemGroups.bind(this)));
      app.put(`/rest/v1${this.toPath('/itemGroups/{itemGroupId}/documentTemplates/{id}')}`, [ keycloak.protect() ], this.catchAsync(this.updateItemGroupDocumentTemplate.bind(this)));
    }
  };

  module.exports = AbstractItemGroupsService;

})();

