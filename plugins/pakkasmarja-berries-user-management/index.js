/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';
  
  const util = require('util'); 
  const config = require('nconf');
  const _ = require('lodash');
  const KeycloakAdminClient = require('keycloak-admin-client');
  const Promise = require('bluebird');
  
  class PakkasmarjaBerriesUserManagement {
    
    constructor (logger) {
      this.logger = logger;
    }
    
    listUsers(realm) {
      return new Promise((resolve, reject) => {
        this.getClient()
          .then((client) => {
            client.users.find(realm)
              .then(resolve)
              .catch(reject);
          })
          .catch();
      });
    }
    
    listUserGroups(realm, userId) {
      return new Promise((resolve, reject) => {
        this.getClient()
          .then((client) => {
            client.users.groups.find(realm, userId)
              .then(resolve)
              .catch(reject);
          })
          .catch();
      });
    }
    
    listGroups(realm) {
      return new Promise((resolve, reject) => {
        this.getClient()
          .then((client) => {
            client.groups.find(realm)
              .then(resolve)
              .catch(reject);
          })
          .catch();
      });
    }
    
    listGroupsMemberIds(realm, groupIds) {
      console.log("listGroupsMemberIds", realm);
      return new Promise((resolve, reject) => {
        this.listGroupsMembers(realm, groupIds)
          .then((members) => {
            resolve(_.uniq(_.map(members, 'id')));
          })
          .catch(reject);
      });
    }
    
    listGroupsMembers(realm, groupIds) {
      console.log("listGroupsMembers", realm);
      return new Promise((resolve, reject) => {
        const promises = _.map(groupIds, (groupId) => {
          return this.listGroupMembers(realm, groupId);
        });

        Promise.all(promises)
          .then((results) => {
            resolve(_.flatten(results));
          })
          .catch(reject);
      });
    }
    
    listGroupMembers(realm, groupId) {
      console.log("listGroupMembers", realm);
      return new Promise((resolve, reject) => {
        this.getClient()
          .then((client) => {
            client.groups.members.find(realm, groupId)
              .then(resolve)
              .catch(reject);
          })
          .catch();
      });
    }
    
    getClient() {
      return KeycloakAdminClient(config.get('keycloak:admin'));
    }
    
  };

  module.exports = (options, imports, register) => {
    const logger = imports['logger'];
    const pakkasmarjaBerriesUserManagement = new PakkasmarjaBerriesUserManagement(logger);
    register(null, {
      'pakkasmarja-berries-user-management': pakkasmarjaBerriesUserManagement
    });
  };

})();
