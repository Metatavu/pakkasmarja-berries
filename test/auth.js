/*jshint esversion: 6 */
/* global __dirname */

(() => {
  "use strict";

  const Promise = require('bluebird');
  const mysql = require('mysql2/promise');
  const fs = require('fs');
  const config = require('nconf');
  const request = require('request');
  const KeycloakAdminClient = require("keycloak-admin-client");
  const keyclockSetup = require(`${__dirname}/../scripts/kc-setup-for-tests.json`);

  config.file({file: `${__dirname}/../config.json`});
  
  /**
   * Auth utility class for tests
   */
  class Auth {
  
    /**
     * Gets access token from keycloak
     * 
     * @param {username} username
     * @param {password} password
     * @return {Promise} promise for results
     */
    async getClientToken(username, password, clientId) {
      const realm = config.get('keycloak:app:realm');
      const url = `${config.get('keycloak:app:auth-server-url')}/realms/${realm}/protocol/openid-connect/token`;
      return new Promise((resolve, reject) => {
        request.post({ url: url, form: {
          client_id: clientId,
          grant_type: 'password',
          username: username,
          password: password
        }}, (err, httpResponse, body) => {
          if (err) {
            reject(err);
          } else {
            resolve(JSON.parse(body).access_token); 
          }
        });
      });
    }
  
    /**
     * Gets access token from keycloak
     * 
     * @param {username} username
     * @param {password} password
     * @return {Promise} promise for results
     */
    getToken(username, password) {
      return this.getClientToken(username, password, config.get('keycloak:app:resource'));
    }
    
    /**
     * Gets access token from user with admin permissions 
     * 
     * @return {Promise} promise for results
     */
    getAdminToken() {
      return this.getToken("admin", "test");
    }

    getAdminCliToken() {
      return this.getClientToken("admin", "test", "admin-cli");
    }

    /**
     * Gets access token from keycloak with user1 username and password
     * 
     * @return {Promise} promise for results
     */
    async getTokenUser1(roles) {
      if (roles) {
        const adminToken = await this.getAdminCliToken();
        const userId = this.getUser1Id();
        await this.addRealmRolesToUser(adminToken, userId, Array.isArray(roles) ? roles : [roles]);
      }

      return this.getToken("test1-testrealm1", "test");
    }

    /**
     * Removes specified roles from user 1
     * 
     * @param {Array} roles list of roles to be removed 
     * @returns {Promise} promise for removed roles
     */
    async removeUser1Roles(roles) {
      const adminToken = await this.getAdminCliToken();
      const userId = this.getUser1Id();
      return this.removeRealmRolesToUser(adminToken, userId, Array.isArray(roles) ? roles : [roles]);
    }

    /**
     * Gets access token from keycloak with user2 username and password
     * 
     * @return {Promise} promise for results
     */
    async getTokenUser2(roles) {
      if (roles) {
        const adminToken = await this.getAdminCliToken();
        const userId = this.getUser2Id();
        await this.addRealmRolesToUser(adminToken, userId, Array.isArray(roles) ? roles : [roles]);
      }

      return this.getToken("test2-testrealm1", "test");
    }

    /**
     * Removes specified roles from user 2
     * 
     * @param {Array} roles list of roles to be removed  
     * @returns {Promise} promise for removed roles
     */
    async removeUser2Roles(roles) {
      const adminToken = await this.getAdminCliToken();
      const userId = this.getUser2Id();
      return this.removeRealmRolesToUser(adminToken, userId, Array.isArray(roles) ? roles : [roles]);
    }

    /**
     * Returns user 1 id
     * 
     * @return {String} user id
     */
    getUser1Id() {
      return "6f1cd486-107e-404c-a73f-50cc1fdabdd6";
    }

    /**
     * Returns user 2 id
     * 
     * @return {String} user id
     */
    getUser2Id() {
      return "677e99fd-b854-479f-afa6-74f295052770";
    }

    /**
     * Returns setup for test realm
     */
    getRealmSetup() {
      return keyclockSetup.filter((realmSetup) => {
        return realmSetup.id === 'pm';
      })[0];
    }

    /**
     * Returns role id for realm role
     * 
     * @param {String} role role 
     * @returns {String} role id for realm role
     */
    getRealmRoleId(role) {
      const realmRoles = this.getRealmSetup().roles.realm;
      for (let i = 0; i < realmRoles.length; i++) {
        if (realmRoles[i].name === role) {
          return realmRoles[i].id;
        }
      }
    }
    
    /**
     * Adds realm roles to user
     * 
     * @param {String} adminToken admin token
     * @param {String} userId user id
     * @param {Array} roles array of roles to be added
     * @returns {Promise} promise for added roles 
     */
    async addRealmRolesToUser(adminToken, userId, roles) {
      const realm = config.get('keycloak:app:realm');
      const client = await KeycloakAdminClient(config.get("keycloak:admin"));

      return client.realms.maps.map(realm, userId, roles.map((role) => {
        return { id: this.getRealmRoleId(role), name: role };
      }));
    }

    /**
     * Removes realm roles to user
     * 
     * @param {String} adminToken admin token
     * @param {String} userId user id
     * @param {Array} roles array of roles to be removed
     * @returns {Promise} promise for removed roles 
     */
    async removeRealmRolesToUser(adminToken, userId, roles) {
      const realm = config.get('keycloak:app:realm');
      const client = await KeycloakAdminClient(config.get("keycloak:admin"));

      return client.realms.maps.unmap(realm, userId, roles.map((role) => {
        return { id: this.getRealmRoleId(role), name: role };
      }));
    }

    /**
     * Creates roles for testing purposes
     * 
     * @returns {Promise} promise for added roles 
     */
    async createRoles() {
      const realm = config.get('keycloak:app:realm');
      const roles = ["list-all-contacts","update-other-contacts","create-contract","list-all-contracts","update-other-contracts","create-contract-document-templates","list-contract-document-templates","update-contract-document-templates","list-item-group-document-templates","update-item-group-document-templates","create-item-group-prices","update-item-group-prices","delete-item-group-prices","list-operation-reports","create-operations"];
      const client = await KeycloakAdminClient(config.get("keycloak:admin"));

      return Promise.all(roles.map((role) => {
        return client.realms.roles.create(realm, {
          name: role
        });
      }));
    }

  }
  
  module.exports = new Auth();
  
})();