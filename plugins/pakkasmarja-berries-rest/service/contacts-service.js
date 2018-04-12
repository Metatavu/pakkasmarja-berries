/*jshint esversion: 6 */
/* global __dirname */

(() => {
  "use strict";

  const AbstractService = require(`${__dirname}/../abstract-service`);

  /**
   * Abstract base class for Contacts REST service
   */
  class AbstractContactsService extends AbstractService {

   /**
    * Find contact
    * Finds contact by id
    *
    * @param {http.ClientRequest} req client request object
    * @param {http.ServerResponse} res server response object
    **/
    findContact(req, res) {
      res.status(501).send();
    }

   /**
    * Lists contacts
    * Lists contacts
    *
    * @param {http.ClientRequest} req client request object
    * @param {http.ServerResponse} res server response object
    **/
    listContacts(req, res) {
      res.status(501).send();
    }

   /**
    * Update contact
    * Updates single contact
    *
    * @param {http.ClientRequest} req client request object
    * @param {http.ServerResponse} res server response object
    **/
    updateContact(req, res) {
      res.status(501).send();
    }

   /**
    * Update contact credentials
    * Updates single contact credentials
    *
    * @param {http.ClientRequest} req client request object
    * @param {http.ServerResponse} res server response object
    **/
    updateContactCredentials(req, res) {
      res.status(501).send();
    }

   /**
    * Registers REST routes
    *
    * @param app express object
    **/
    register(app, keycloak) {
      app.get(`/rest/v1${this.toPath('/contacts/{id}')}`, [ keycloak.protect() ], this.catchAsync(this.findContact.bind(this)));
      app.get(`/rest/v1${this.toPath('/contacts')}`, [ keycloak.protect() ], this.catchAsync(this.listContacts.bind(this)));
      app.put(`/rest/v1${this.toPath('/contacts/{id}')}`, [ keycloak.protect() ], this.catchAsync(this.updateContact.bind(this)));
      app.put(`/rest/v1${this.toPath('/contacts/{id}/credentials')}`, [ keycloak.protect() ], this.catchAsync(this.updateContactCredentials.bind(this)));
    }
  };

  module.exports = AbstractContactsService;

})();

