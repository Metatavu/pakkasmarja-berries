/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';

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
    * Registers REST routes
    *
    * @param app express object
    **/
    register(app) {
      app.get('/rest/v1/contacts/{id}', [ this.restAuth.bind(this) ], this.findContact.bind(this));
      app.get('/rest/v1/contacts', [ this.restAuth.bind(this) ], this.listContacts.bind(this));
      app.put('/rest/v1/contacts/{id}', [ this.restAuth.bind(this) ], this.updateContact.bind(this));
    }
  };

  module.exports = AbstractContactsService;

})();

