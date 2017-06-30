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
    }
    
    findUser(realm, id) {
      return new Promise((resolve, reject) => {
        this.getClient()
          .then((client) => {
            client.users.find(realm, { userId: id })
              .then(resolve)
              .catch(reject);
          })
          .catch(reject);
      });
    }
    
    listUsers(realm) {
      return new Promise((resolve, reject) => {
        this.getClient()
          .then((client) => {
            client.users.find(realm)
              .then(resolve)
              .catch(reject);
          })
          .catch(reject);
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
            resolve(_.flatten(results));
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
              .catch(reject);
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
      return user.firstName && user.lastName ? `${user.firstName} ${user.lastName} <${user.email}>` : `<${user.email}>`;
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
    
    getClient() {
      return KeycloakAdminClient(config.get('keycloak:admin'));
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
