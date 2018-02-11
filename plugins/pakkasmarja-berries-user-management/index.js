/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';
  
  const util = require('util'); 
  const config = require('nconf');
  const _ = require('lodash');
  const crypto = require('crypto');
  const KeycloakAdminClient = require('keycloak-admin-client');
  const Promise = require('bluebird');
  
  class PakkasmarjaBerriesUserManagement {
    
    constructor (logger, models) {
      this.logger = logger;
      this.models = models;
      this._client = null;
      this._requireFreshClient = true;
      setInterval(() => {
        this._requireFreshClient = true;
      }, 45 * 1000);
    }
    
    /**
     * Finds single user from Keycloak.
     * 
     * @param {String} realm realm (optional)
     * @param {String} id user id
     * @return {Promise} promise for a user or null if not found
     */
    findUser(realm, id) {
      return new Promise((resolve, reject) => {
        return this.getClient().then((client) => {
          const keycloakRealm = arguments.length === 2 ? realm : null;
          const keycloakId = arguments.length === 2 ? id : realm;
          return client.users.find(keycloakRealm || config.get('keycloak:realm'), { userId: keycloakId })
            .then((user) => {
              resolve(user);
            })
            .catch((err) => {
              if (err) {
                reject(err);
              } else {
                resolve(null);
              }
            });
        });
      });
    }
    
    /**
     * Lists users from Keycloak. 
     * 
     * @param {String} realm realm (optional)
     * @return {Promise} promise for users
     */
    listUsers(realm) {
      return this.getClient().then((client) => {
        return client.users.find(realm || config.get('keycloak:realm'));
      });
    }
    
    listUserGroupIds(realm, userId) {
      return new Promise((resolve, reject) => {
        this.listUserGroups(realm, userId)
          .then((userGroup) => {
            resolve(_.uniq(_.map(userGroup, 'id')));
          })
          .catch(reject);
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
          .catch(reject);
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
          .catch(reject);
      });
    }
    
    listGroupsMemberIds(realm, groupIds) {     
      return new Promise((resolve, reject) => {
        this.listGroupsMembers(realm, groupIds)
          .then((members) => {
            resolve(_.uniq(_.map(members, 'id')));
          })
          .catch(reject);
      });
    }
    
    listGroupsMembers(realm, groupIds) {
      return new Promise((resolve, reject) => {
        const promises = _.map(groupIds, (groupId) => {
          return this.listGroupMembers(realm, groupId);
        });

        Promise.all(promises)
          .then((results) => {
            resolve(_.compact(_.flatten(results)));
          })
          .catch(reject);
      });
    }
    
    listGroupMembers(realm, groupId) {
      return new Promise((resolve, reject) => {
        this.getClient()
          .then((client) => {
            client.groups.members.find(realm, groupId)
              .then(resolve)
              .catch((err) => {
                resolve([]);
              });
          })
          .catch();
      });
    }
    
    getUserMap(realm, userIds) {
      return new Promise((resolve, reject) => {
        const userPromises = _.map(userIds, (userId) => {
          return this.findUser(realm, userId);
        });

        Promise.all(userPromises)
          .then((users) => {
            const result = {};
    
            users.forEach((user) => {
              result[user.id] = user;
            });
            
            resolve(result);
          })
          .catch(reject);
      });
    }
    
    getUserDisplayName(user) {
      const attributes = {};

      _.forEach(user.attributes||{}, (originalValue, key) => {
        const value = _.isArray(originalValue) ? originalValue.join('') : originalValue;
        attributes[String(key).toLowerCase()] = value;
      });
     
      if (attributes['näyttönimi']) {
        return attributes['näyttönimi'];
      }
      
      const company = attributes.yritys;
      const name = user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName || user.lastName ;
      
      if (company && name) {
        return `${name} ${company}`;
      }
      
      if (company) {
        return company;
      }
      
      if (name) {
        return name;
      }
      
      return `<${user.email}>`;
    }
    
    getUserImage(user) {
      const shasum = crypto.createHash('sha1');
      shasum.update(user.email.toLowerCase());
      const hash = shasum.digest('hex');
      return `https://www.gravatar.com/avatar/${hash}?d=identicon`;
    }
    
    getThreadUserRole(realm, threadId, userId) {
      return this.models.getThreadUserGroupRoleMap(threadId)
        .then((userGroupRoleMap) => {
          return this.listUserGroupIds(realm, userId)
            .then((userGroupIds) => {
              return this.getUserGroupRole(userGroupRoleMap, userGroupIds);
            });
        });
    }
    
    getQuestionGroupUserRole(realm, questionGroupId, userId) {
      return this.models.getQuestionGroupUserGroupRoleMap(questionGroupId)
        .then((userGroupRoleMap) => {
          return this.listUserGroupIds(realm, userId)
            .then((userGroupIds) => {
              return this.getUserGroupRole(userGroupRoleMap, userGroupIds);
            });
        });
    }
    
    getUserGroupRole(userGroupRoleMap, userGroupIds) {
      let result = null;
      
      userGroupIds.forEach((userGroupId) => {
        const role = userGroupRoleMap[userGroupId];
        if (this.getRoleIndex(role) > this.getRoleIndex(result)) {
          result = role; 
        }
      });
      
      return result;
    }
    
    getRoleIndex(role) {
      if (role === 'manager') {
        return 2;
      } else if (role === 'user') {
        return 1;
      }
      
      return 0;
    }
    
    getThreadUserIds(realm, threadId) {
      return this.models.listThreadUserGroupIds(threadId)
        .then((threadUserGroupIds) => {
          return this.listGroupsMemberIds(realm, threadUserGroupIds);
        });
    }
    
    getQuestionGroupUserIds(realm, questionGroupId) {
      return this.models.listQuestionGroupUserGroupIds(questionGroupId)
        .then((questionGroupUserGroupIds) => {
          return this.listGroupsMemberIds(realm, questionGroupUserGroupIds);
        });
    }
    
    isValidUserId(userId) {
      if (typeof userId === 'string') {
        return !!userId.match(/[0-9a-zA-Z]{8}-[0-9a-zA-Z]{4}-[0-9a-zA-Z]{4}-[0-9a-zA-Z]{4}-[0-9a-zA-Z]{12}$/);
      }
      
      return false;
    }
    
    checkPermissionToPostThread(realm, userId, threadId) {
      return this.getThreadUserIds(realm, threadId)
        .then((threadUserIds) => {
          return _.indexOf(threadUserIds||[], userId) >= 0;
        });
    }
    
    checkPermissionToReadThread(realm, userId, threadId) {
      return this.checkPermissionToPostThread(realm, userId, threadId);
    }
    
    checkPermissionToReadMessage(realm, userId, messageId) {
      return this.models.findMessage(messageId)
        .then((message) => {
          if (message) {
            return this.checkPermissionToReadThread(realm, userId, message.threadId);
          } else {
            return false;
          }
        });
    }
    
    checkPermissionToListQuestionGroupThreads(realm, userId, questionGroupId) {
      return this.getQuestionGroupUserIds(realm, questionGroupId)
        .then((threadUserIds) => {
          return _.indexOf(threadUserIds||[], userId) >= 0;
        });
    }
    
    checkPermissionToDeleteMessages(realm, userId, messageId) {
      return new Promise((resolve, reject) => {
        this.getClient()
          .then((client) => {
            client.users.roleMappings.find(realm, userId)
              .then((userRoleMappings) => {
                let hasManagerRole = false;
                if (userRoleMappings && userRoleMappings.realmMappings) {
                  const realmRoles = userRoleMappings.realmMappings;
                  for (let i = 0; i < realmRoles.length; i++) {
                    if (realmRoles[i].name === 'app-manager') {
                      hasManagerRole = true;
                      break;
                    }
                  }
                }
                resolve(hasManagerRole);
            })
            .catch(reject);
          })
          .catch(reject);
      });
    }
    
    /**
     * Returns single user attribute
     * 
     * @param {Object} user Keycloak user
     * @param {String[]} names attribute name or names
     * @return {String} attribute value or null if not found
     */
    getSingleAttribute(user, names) {
      const attributes = user.attributes || {};
      const nameAttr = _.isArray(names) ? names : [ names ];
      for (let i = 0; i < nameAttr.length; i++) {
        const name = nameAttr[i];        
        const values = _.isArray(attributes[name]) ? _.compact(attributes[name]) : [];

        if (values.length === 1) {
          return values[0];
        }
      }
      
      return null;
    }
    
    getClient() {
      if (!this._client || this._requireFreshClient) {
        this._client = KeycloakAdminClient(config.get('keycloak:admin'));
        this._requireFreshClient = false;
      }
      
      return this._client;
    }
    
    get ATTRIBUTE_SAP_ID() {
      return 'sapId';
    }
    
    get ATTRIBUTE_COMPANY_NAME() {
      return 'yritys';
    }
    
    get ATTRIBUTE_BIC() {
      return 'BIC';
    }
    
    get ATTRIBUTE_IBAN() {
      return 'IBAN';
    }
    
    get ATTRIBUTE_TAX_CODE() {
      return 'verotunniste';
    }
    
    get ATTRIBUTE_VAT_LIABLE() {
      return 'arvonlisäverovelvollisuus';
    }
    
    get ATTRIBUTE_AUDIT() {
      return 'auditointi';
    }
    
    get ATTRIBUTE_PHONE_1() {
      return 'Puhelin 1';
    }
    
    get ATTRIBUTE_PHONE_2() {
      return 'Puhelin 2';
    }
    
    get ATTRIBUTE_POSTAL_CODE_1() {
      return 'Postinro';
    }
    
    get ATTRIBUTE_POSTAL_CODE_2() {
      return 'tilan postinro';
    }
    
    get ATTRIBUTE_STREET_1() {
      return 'Postiosoite';
    }
    
    get ATTRIBUTE_STREET_2() {
      return 'Tilan osoite';
    }
    
  };

  module.exports = (options, imports, register) => {
    const logger = imports['logger'];
    const models = imports['pakkasmarja-berries-models'];
    const pakkasmarjaBerriesUserManagement = new PakkasmarjaBerriesUserManagement(logger, models);
    register(null, {
      'pakkasmarja-berries-user-management': pakkasmarjaBerriesUserManagement
    });
  };

})();
