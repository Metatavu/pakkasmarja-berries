/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';

  const AbstractContactsService = require(`${__dirname}/../service/contacts-service`);
  const Contact = require(`${__dirname}/../model/contact`);

  /**
   * Implementation for Contacts REST service
   */
  class ContactsServiceImpl extends AbstractContactsService {
    
    /**
     * Constructor for Contacts service
     * 
     * @param {Object} logger logger
     * @param {Object} models models
     * @param {Object} userManagement userManagement
     */
    constructor (logger, models, userManagement) {
      super();
      
      this.logger = logger;
      this.models = models;
      this.userManagement = userManagement;
    }

   /**
    * @inheritdoc
    **/
    async listContacts(req, res) {
      const users = await this.userManagement.listUsers();
      const contacts = users.map((user) => {
        const attributes = user.attributes || {};
        
        return Contact.constructFromObject({
          'id': user.id,
          'status': attributes.status || 'unknown'
        });
      });
      
      res.status(200).send(contacts);
    }
    
  };

  module.exports = ContactsServiceImpl;

})();

