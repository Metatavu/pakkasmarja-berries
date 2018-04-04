/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';

  const _ = require('lodash');
  const AbstractContactsService = require(`${__dirname}/../service/contacts-service`);
  const Contact = require(`${__dirname}/../model/contact`);
  const Credentials = require(`${__dirname}/../model/credentials`);
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
     */
    /* jshint ignore:start */
    async findContact(req, res) {
      const userId = req.params.id;
      if (!userId) {
        this.sendNotFound(res);
        return;
      }

      const user = await this.userManagement.findUser(userId);
      if (!user) {
        this.sendNotFound(res);
        return;
      }

      res.status(200).send(this.translateKeycloakUser(user));
    }
    /* jshint ignore:end */
    
    /**
     * @inheritdoc
     */
    /* jshint ignore:start */
    async listContacts(req, res) {
      const users = await this.userManagement.listUsers();
      const contacts = users.map((user) => {
        return this.translateKeycloakUser(user);
      });
      
      res.status(200).send(contacts);
    }
    /* jshint ignore:end */
    
    /**
     * @inheritdoc
     */
    /* jshint ignore:start */
    async updateContact(req, res) {
      const userId = req.params.id;
      if (!userId) {
        this.sendNotFound(res);
        return;
      }
      
      const updateContact = _.isObject(req.body) ? Contact.constructFromObject(req.body) : null;
      if (!updateContact || !_.isArray(updateContact.phoneNumbers) || !_.isArray(updateContact.addresses)) {
        this.sendBadRequest(res, "Failed to parse body");
        return;
      }
      
      const user = await this.userManagement.findUser(userId);
      if (!user) {
        this.sendNotFound(res);
        return;
      }
      
      this.userManagement.updateUser(this.updateKeycloakUserModel(user, updateContact))
        .then(() => {
          return this.userManagement.findUser(userId);
        })
        .then((updatedUser) => {
          res.status(200).send(this.translateKeycloakUser(updatedUser));
        })
        .catch((err) => {
          this.sendInternalServerError(res, err);
          return;
        });
    }
    
    /**
     * @inheritdoc
     */
    async updateContactCredentials(req, res) {
      const userId = req.params.id;
      if (!userId) {
        this.sendNotFound(res);
        return;
      }

      const updateCredentials = _.isObject(req.body) ? Credentials.constructFromObject(req.body) : null;
      if (!updateCredentials || !updateCredentials.password) {
        this.sendBadRequest(res, "Failed to parse body");
        return;
      }

      const user = await this.userManagement.findUser(userId);
      if (!user) {
        this.sendNotFound(res);
        return;
      }

      const loggedUserId = this.getLoggedUserId(req);
        if (user.id !== loggedUserId) {
        this.sendForbidden(res, "Cannot update other users credentials");
      }

      this.userManagement.resetUserPassword(loggedUserId, updateCredentials.password, false)
        .then(() => {
          res.status(204).send();
        })
        .catch((err) => {
          this.sendInternalServerError(res, err);
        });
    }
    
    /**
     * Translates Keycloak user into Contact
     * 
     * @param {Object} user Keycloak user
     * @return {Contact} contact 
     */
    translateKeycloakUser(user) {
      return Contact.constructFromObject({
        'id': user.id,
        'firstName': user.firstName,
        'lastName': user.lastName,
        'companyName': this.userManagement.getSingleAttribute(user, this.userManagement.ATTRIBUTE_COMPANY_NAME),
        'phoneNumbers': this.resolveKeycloakUserPhones(user),
        'email': user.email,
        'addresses': this.resolveKeycloakUserAddresses(user),
        'BIC': this.userManagement.getSingleAttribute(user, this.userManagement.ATTRIBUTE_BIC),
        'IBAN': this.userManagement.getSingleAttribute(user, this.userManagement.ATTRIBUTE_IBAN),
        'taxCode': this.userManagement.getSingleAttribute(user, this.userManagement.ATTRIBUTE_TAX_CODE),
        'vatLiable': this.userManagement.getSingleAttribute(user, this.userManagement.ATTRIBUTE_VAT_LIABLE),
        'audit': this.userManagement.getSingleAttribute(user, this.userManagement.ATTRIBUTE_AUDIT)
      });
    }
    
    /**
     * Updates Keycloak user from contact entity
     * 
     * @param {Object} keycloakUser Keycloak user
     * @param {Contact} contact contact entity
     * @return {Object} updated Keycloak user
     */
    updateKeycloakUserModel(keycloakUser, contact) {
      const user = Object.assign({}, keycloakUser, {
        'firstName': contact.firstName,
        'lastName': contact.lastName,
        'email': contact.email
      });
      
      this.userManagement.setSingleAttribute(user, this.userManagement.ATTRIBUTE_COMPANY_NAME, contact.companyName);
      this.userManagement.setSingleAttribute(user, this.userManagement.ATTRIBUTE_BIC, contact.BIC);
      this.userManagement.setSingleAttribute(user, this.userManagement.ATTRIBUTE_IBAN, contact.IBAN);
      this.userManagement.setSingleAttribute(user, this.userManagement.ATTRIBUTE_TAX_CODE, contact.taxCode);
      this.userManagement.setSingleAttribute(user, this.userManagement.ATTRIBUTE_VAT_LIABLE, contact.vatLiable);
      this.userManagement.setSingleAttribute(user, this.userManagement.ATTRIBUTE_AUDIT, contact.audit);
      this.userManagement.setSingleAttribute(user, this.userManagement.ATTRIBUTE_PHONE_1, contact.phoneNumbers.length > 0 ? contact.phoneNumbers[0] : null);
      this.userManagement.setSingleAttribute(user, this.userManagement.ATTRIBUTE_PHONE_2, contact.phoneNumbers.length > 1 ? contact.phoneNumbers[1] : null);
      this.userManagement.setSingleAttribute(user, this.userManagement.ATTRIBUTE_POSTAL_CODE_1, contact.addresses.length > 0 ? contact.addresses[0].postalCode : null);
      this.userManagement.setSingleAttribute(user, this.userManagement.ATTRIBUTE_STREET_1, contact.addresses.length > 0 ? contact.addresses[0].streetAddress : null);
      this.userManagement.setSingleAttribute(user, this.userManagement.ATTRIBUTE_POSTAL_CODE_2, contact.addresses.length > 1 ? contact.addresses[1].postalCode : null);
      this.userManagement.setSingleAttribute(user, this.userManagement.ATTRIBUTE_STREET_2, contact.addresses.length > 1 ? contact.addresses[1].streetAddress : null);
      
      return user;
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
        const phoneNumber1 = this.userManagement.getSingleAttribute(user, this.userManagement.ATTRIBUTE_PHONE_1);
        const phoneNumber2 = this.userManagement.getSingleAttribute(user, this.userManagement.ATTRIBUTE_PHONE_2);
        
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
        const postalCode1 = this.userManagement.getSingleAttribute(user, this.userManagement.ATTRIBUTE_POSTAL_CODE_1);
        const postalCode2 = this.userManagement.getSingleAttribute(user, this.userManagement.ATTRIBUTE_POSTAL_CODE_2);
        const streetAddress1 = this.userManagement.getSingleAttribute(user, this.userManagement.ATTRIBUTE_STREET_1);
        const streetAddress2 = this.userManagement.getSingleAttribute(user, this.userManagement.ATTRIBUTE_STREET_2);
         
        if (postalCode1 && streetAddress1) {
          result.push(Address.constructFromObject({
            "streetAddress": streetAddress1,
            "postalCode": postalCode1
          }));  
        } 
      }
      
      return result;
    }
    
  }

  module.exports = ContactsServiceImpl;

})();

