/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';

  const Promise = require('bluebird');
  const mysql = require('mysql2/promise');
  const fs = require('fs');
  const config = require('nconf');
  const request = require('request');
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
    async getToken(username, password) {
      const url = `${config.get('keycloak:app:auth-server-url')}/realms/${config.get('keycloak:app:realm')}/protocol/openid-connect/token`;
      return new Promise((resolve, reject) => {
        request.post({ url: url, form: {
          client_id: config.get('keycloak:app:resource'),
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
     * Gets access token from user with permission to list all contracts 
     * 
     * @return {Promise} promise for results
     */
    getTokenListAllContracts() {
      return this.getToken("list-all-contracts", "test");
    }

    /**
     * Gets access token from keycloak with default username and password
     * 
     * @return {Promise} promise for results
     */
    getTokenDefault() {
      return this.getToken("test1-testrealm1", "test");
    }
    
  }
  
  module.exports = new Auth();
  
})();