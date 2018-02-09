/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';

  const _ = require('lodash');
  const AbstractContactsService = require(`${__dirname}/../service/contacts-service`);
  const Contact = require(`${__dirname}/../model/contact`);
  const Address = require(`${__dirname}/../model/address`);

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
          'status': this.getSingleAttribute(user.attributes, 'status'),
          'sapId': this.getSingleAttribute(user.attributes, 'sapId'),
          'firstName': user.firstName,
          'lastName': user.lastName,
          'companyName': '',
          'phoneNumbes': this.resolveKeycloakUserPhones(user),
          'email': user.email,
          'addresses': this.resolveKeycloakUserAddresses(user),
          'BIC': '',
          'IBAN': '',
          'taxCode': '',
          'vatLiable': '',
          'audit': ''  
        });
      });
      
      res.status(200).send(contacts);
    }
    
    /**
     * Resolves Keycloak user's phone numbers
     * 
     * @param {Object} user
     * @return {String[]} array of phone numbers
     */
    resolveKeycloakUserPhones(user) {
      const result = [];
      if (user && user.attributes) {
        const phoneNumber1 = this.getSingleAttribute(user.attributes, 'Puhelin 1');
        const phoneNumber2 = this.getSingleAttribute(user.attributes, 'Puhelin 2');
        
        if (phoneNumber1) {
          result.push(phoneNumber1);
        }

        if (phoneNumber2) {
          result.push(phoneNumber2);
        }
      }
      
      return _.compact(result);
    }
    
    /**
     * Resolves Keycloak user's addresses
     * 
     * @param {Object} user
     * @return {Address[]} array of addresses
     */
    resolveKeycloakUserAddresses(user) {
      const result = [];
      if (user && user.attributes) {
        const postalCode1 = this.getSingleAttribute(user.attributes, 'Postinro');
        const postalCode2 = this.getSingleAttribute(user.attributes, 'tilan postinro');
        const streetAddress1 = this.getSingleAttribute(user.attributes, 'Postiosoite');
        const streetAddress2 = this.getSingleAttribute(user.attributes, 'Tilan osoite');
        
        if (postalCode1 && streetAddress1) {
          result.push(Address.constructFromObject({
            "streetAddress": streetAddress1,
            "postalCode": postalCode1
          }));  
        } 
      }
      
      return result;
    }
    
    getSingleAttribute(attributes, name) {
      const values = _.isArray(attributes[name]) ? _.compact(attributes[name]) : [];
      
      if (values.length === 1) {
        return values[0];
      }
      
      return null;
    }
    
  };

  module.exports = ContactsServiceImpl;

})();

