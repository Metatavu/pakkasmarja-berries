/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';
  
  const _ = require('lodash');
  const config = require('nconf');
  const FCM = require('fcm-push');
  const Promise = require('bluebird');
  
  class PushNotifications {
    
    constructor (logger, models, userManagement) {
      this.logger = logger;
      this.models = models;
      this.userManagement = userManagement;
      this.fcm = new FCM(config.get('firebase:server-key'));
    }
    
    notifyNewsItemPublish(title) {
      const message = {
        to: '/topics/news',
        notification: {
          title: 'Uusi uutinen',
          body: `Uusi uutinen otsikolla ${title} -julkaistu!`,
          sound: 'news'
        }
      };

      this.fcm.send(message)
        .then((response) => {
          this.logger.info(`Push notification sent with message ${response}`);
        })
        .catch((err) => {
         this.logger.info(`Push notification sending failed`, err);
        });
    }
    
    notifyConversationThreadMessage(id, threadTitle) {
      const message = {
        to: `/topics/conversation-thread-${id}`,
        notification: {
          title: `Uusi vastaus keskusteluketjussa`,
          body: `Uusi vastaus keskusteluketjussa ${threadTitle}`,
          sound: 'conversation-thread'
        }
      };

      this.fcm.send(message)
        .then((response) => {
          this.logger.info(`Push notification sent with message ${response}`);
        })
        .catch((err) => {
         this.logger.info(`Push notification sending failed`, err);
        });
    }
    
    notifyQuestionGroupThreadMessage(id, groupTitle) {
      const message = {
        to: `/topics/question-group-thread-${id}`,
        notification: {
          title: `Uusi vastaus kyselyryhmässä`,
          body: `Uusi vastaus kyselyryhmässä ${groupTitle}`,
          sound: 'question-thread'
        }
      };

      this.fcm.send(message)
        .then((response) => {
          this.logger.info(`Push notification sent with message ${response}`);
        })
        .catch((err) => {
          this.logger.info(`Push notification sending failed`, err);
        });
    }
    
    notifyThreadMessage(threadId) {
      return this.models.findThread(threadId)
        .then((thread) => {
          if (thread) {
            if (thread.type === 'conversation') {
              this.notifyConversationThreadMessage(thread.id, thread.title);
            } else if (thread.type === 'question') {
              return this.findQuestionGroupByThreadId(thread.id)
                .then((questionGroup) => {
                  if (questionGroup) {
                    this.notifyQuestionGroupThreadMessage(thread.id, questionGroup.title);
                  } else {
                    this.logger.info(`Push notification sending failed because we could not find thread ${threadId} questionGroup`);
                    return null;
                  }
                });
            } else {
              this.logger.info(`Push notification sending failed thread because ${threadId} type is unknown ${thread.type}`);
              return null;
            }
          } else {
            this.logger.info(`Push notification sending failed because thread ${threadId} does not exist`);
            return null;
          }
        });
    }
    
    getSubscribableConversationThreads(userId) {
      return this.userManagement.listUserGroupIds(config.get('keycloak:realm'), userId)
        .then((userGroupIds) => {
          const threadPromises = _.map(userGroupIds, (userGroupId) => {
            return this.models.listConversationThreadsByUserGroupId(userGroupId);
          });

          return Promise.all(threadPromises)
            .then((datas) => {
              return _.map(_.flatten(datas), 'id');
            });
        });
    }
    
    getSubscribableQuestionGroupThreads(userId) {
      return this.userManagement.listUserGroupIds(config.get('keycloak:realm'), userId)
        .then((userGroupIds) => {
          const questionGroupPromises = _.map(userGroupIds, (userGroupId) => {
            return this.models.listQuestionGroupsByUserGroupId(userGroupId);
          });

          return Promise.all(questionGroupPromises)
            .then((datas) => {
              const data = _.flatten(datas);
              const rolePromises = _.map(data, (questionGroup) => {
                return this.userManagement.getQuestionGroupUserRole(config.get('keycloak:realm'), questionGroup.id, userId);
              });

              return Promise.all(rolePromises)
                .then((roles) => {
                  const threadIdPromises = _.map(data, (questionGroup, index) => {
                    const role = roles[index];

                    if (role === 'user') {
                      return this.models.findQuestionGroupUserThreadByQuestionGroupIdAndUserId(questionGroup.id, userId)
                        .then((thread) => {
                          if (thread) {
                            return [ thread.threadId ];
                          } else {
                            return [];
                          }
                        });
                    } else if (role === 'manager') {
                      this.models.listQuestionGroupUserThreadsByQuestionGroupId(questionGroup.id)
                        .then((questionGroupUserThreads) => {
                          return _.map(questionGroupUserThreads, 'threadId');
                        });
                    } else {
                      this.logger.error(`Unknown question group role ${role}`);
                      return [];
                    }
                  });

                  return Promise.all(threadIdPromises)
                    .then((threadIds) => {
                      return _.flatten(threadIds);
                    });
               });
          });
        });
    }
    
  }

  module.exports = (options, imports, register) => {
    const logger = imports['logger'];
    const models = imports['pakkasmarja-berries-models'];
    const userManagement = imports['pakkasmarja-berries-user-management'];
    
    const pushNotifications = new PushNotifications(logger, models, userManagement);
    register(null, {
      'pakkasmarja-berries-push-notifications': pushNotifications
    });
  };

})();
