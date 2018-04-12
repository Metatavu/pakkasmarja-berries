/*jshint esversion: 6 */
/* global __dirname */

(() => {
  "use strict";

  const AbstractService = require(`${__dirname}/../abstract-service`);

  /**
   * Abstract base class for ItemGroups REST service
   */
  class AbstractItemGroupsService extends AbstractService {

   /**
    * Creates item group price
    * Creates an item group price
    *
    * @param {http.ClientRequest} req client request object
    * @param {http.ServerResponse} res server response object
    **/
    createItemGroupPrice(req, res) {
      res.status(501).send();
    }

   /**
    * Delete item group price
    * Deletes an item group price
    *
    * @param {http.ClientRequest} req client request object
    * @param {http.ServerResponse} res server response object
    **/
    deleteItemGroupPrice(req, res) {
      res.status(501).send();
    }

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
    * Find item group price
    * Finds a item group price
    *
    * @param {http.ClientRequest} req client request object
    * @param {http.ServerResponse} res server response object
    **/
    findItemGroupPrice(req, res) {
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
    * List item group prices
    * Lists item group prices
    *
    * @param {http.ClientRequest} req client request object
    * @param {http.ServerResponse} res server response object
    **/
    listItemGroupPrices(req, res) {
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
    * Update item group price
    * Updates a item group price
    *
    * @param {http.ClientRequest} req client request object
    * @param {http.ServerResponse} res server response object
    **/
    updateItemGroupPrice(req, res) {
      res.status(501).send();
    }

   /**
    * Registers REST routes
    *
    * @param app express object
    **/
    register(app, keycloak) {
      app.post(`/rest/v1${this.toPath('/itemGroups/{itemGroupId}/prices')}`, [ keycloak.protect() ], this.catchAsync(this.createItemGroupPrice.bind(this)));
      app.delete(`/rest/v1${this.toPath('/itemGroups/{itemGroupId}/prices/{priceId}')}`, [ keycloak.protect() ], this.catchAsync(this.deleteItemGroupPrice.bind(this)));
      app.get(`/rest/v1${this.toPath('/itemGroups/{id}')}`, [ keycloak.protect() ], this.catchAsync(this.findItemGroup.bind(this)));
      app.get(`/rest/v1${this.toPath('/itemGroups/{itemGroupId}/documentTemplates/{id}')}`, [ keycloak.protect() ], this.catchAsync(this.findItemGroupDocumentTemplate.bind(this)));
      app.get(`/rest/v1${this.toPath('/itemGroups/{itemGroupId}/prices/{priceId}')}`, [ keycloak.protect() ], this.catchAsync(this.findItemGroupPrice.bind(this)));
      app.get(`/rest/v1${this.toPath('/itemGroups/{itemGroupId}/documentTemplates')}`, [ keycloak.protect() ], this.catchAsync(this.listItemGroupDocumentTemplates.bind(this)));
      app.get(`/rest/v1${this.toPath('/itemGroups/{itemGroupId}/prices')}`, [ keycloak.protect() ], this.catchAsync(this.listItemGroupPrices.bind(this)));
      app.get(`/rest/v1${this.toPath('/itemGroups')}`, [ keycloak.protect() ], this.catchAsync(this.listItemGroups.bind(this)));
      app.put(`/rest/v1${this.toPath('/itemGroups/{itemGroupId}/documentTemplates/{id}')}`, [ keycloak.protect() ], this.catchAsync(this.updateItemGroupDocumentTemplate.bind(this)));
      app.put(`/rest/v1${this.toPath('/itemGroups/{itemGroupId}/prices/{priceId}')}`, [ keycloak.protect() ], this.catchAsync(this.updateItemGroupPrice.bind(this)));
    }
  };

  module.exports = AbstractItemGroupsService;

})();

