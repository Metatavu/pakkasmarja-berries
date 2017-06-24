/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';
  
  const _ = require('lodash');
  const util = require('util'); 
  const config = require('nconf');
  const moment = require('moment');
  const uuid = require('uuid4');
  const Promise = require('bluebird');
  
  class PakkasmarjaBerriesWebsocketMessages {
    
    constructor (logger, models, shadyMessages, userManagement, wordpress) {
      this.logger = logger;
      this.models = models;
      this.shadyMessages = shadyMessages;
      this.userManagement = userManagement;
      this.wordpress = wordpress;
    }
    
    handleWebSocketError(client, operation) {
      return (err) => {
        const failedOperation = operation || 'UNKNOWN_OPERATION';
        this.logger.error(util.format('ERROR DURING OPERATION %s: %s', failedOperation, err));
        // TODO notify client
      };
    }
    
    onSendMessage(message, client) {
      this.getUserId(client)
        .then((userId) => {
          // TODO: is user allowed to post the message?

          const threadId = this.models.toUuid(message.threadId);
          const contents = message.contents;

          this.models.findThread(threadId)
            .then((thread) => {
              const userGroupIds = Object.keys(thread.userGroupRoles);
              this.userManagement.listGroupsMemberIds(config.get('keycloak:realm'), userGroupIds)
                .then((userIds) => {
                  const messageId = this.models.getUuid();
                  this.models.createMessage(messageId, threadId, userId, contents)
                    .then(() => {
                      this.models.findMessage(messageId)
                        .then((message) => {
                          userIds.forEach((userId) => {
                            this.shadyMessages.trigger("client:message-added", {
                              "userId": userId,
                              "message": message
                            });
                          });
                        })
                        .catch(this.handleWebSocketError(client, 'SEND_MESSAGE'));
                    })
                    .catch(this.handleWebSocketError(client, 'SEND_MESSAGE'));            
                });
            })
            .catch(this.handleWebSocketError(client, 'SEND_MESSAGE'));

        })
        .catch(this.handleWebSocketError(client, 'SEND_MESSAGE'));
    }
    
    onGetNews(message, client) {
      const page = message.page;
      const perPage = message.perPage;
      
      this.wordpress.listNews(page, perPage)
        .then((newItems) => {
          client.sendMessage({
            "type": "news-items-added",
            "data": {
              items: _.map(newItems, (newsItem) => {
                return {
                  "id": newsItem.id,
                  "contents": newsItem.content.rendered,
                  "title": newsItem.title.rendered,
                  "created": moment(newsItem.date_gmt).format(),
                  "modified": moment(newsItem.modified_gmt).format(),
                  "image": newsItem.better_featured_image ? newsItem.better_featured_image.source_url : null
                };
              })
            }
          });
        })
        .catch(this.handleWebSocketError(client, 'GET_POSTS'));
    }
    
    onGetThreads(message, client) {
      const type = message['thread-type'];
      this.getUserGroupIds(client)
        .then((userGroupIds) => {
          const threadPromises = _.map(userGroupIds, (userGroupId) => {
            return this.models.listThreadsByTypeAndUserGroupId(type, userGroupId);
          });
  
          Promise.all(threadPromises)
            .then((threads) => {
              client.sendMessage({
                "type": "threads-added",
                "data": {
                  threads: _.flatten(threads)
                }
              });
            })
            .catch(this.handleWebSocketError(client, 'GET_THREADS'));
        })
        .catch(this.handleWebSocketError(client, 'GET_THREADS'));
    }
    
    onGetQuestionGroups(message, client) {
      this.getUserGroupIds(client)
        .then((userGroupIds) => {
          const questionGroupPromises = _.map(userGroupIds, (userGroupId) => {
            return this.models.listQuestionGroupsByUserGroupId(userGroupId);
          });
  
          Promise.all(questionGroupPromises)
            .then((data) => {
              const questionGroups = _.map(_.flatten(data), (questionGroup) => {
                return {
                  id: questionGroup.id,
                  title: questionGroup.title,
                  originId: questionGroup.originId,
                  imagePath: questionGroup.imagePath,
                  role: this.getQuestionGroupRole(questionGroup, userGroupIds)
                };
              });
              
              client.sendMessage({
                "type": "question-groups-added",
                "data": {
                  'question-groups': questionGroups
                }
              });
            })
            .catch(this.handleWebSocketError(client, 'GET_QUESTION_GROUPS'));
        })
        .catch(this.handleWebSocketError(client, 'GET_QUESTION_GROUPS'));
    }
    
    onSelectQuestionGroupThread(message, client) {
      const questionGroupId = this.models.toUuid(message['question-group-id']);
      this.getUserId(client)
        .then((userId) => {
          this.models.findQuestionGroup(questionGroupId)
            .then((questionGroup) => {
              this.models.findOrCreateQuestionGroupUserThread(questionGroup, userId)
                .then((thread) => {
                  client.sendMessage({
                    "type": "question-thread-selected",
                    "data": {
                      'thread-id': thread.id
                    }
                  });
                })
                .catch(this.handleWebSocketError(client, 'GET_QUESTION_GROUP_THREAD'));
            })
            .catch(this.handleWebSocketError(client, 'GET_QUESTION_GROUP_THREAD'));
        })
        .catch(this.handleWebSocketError(client, 'GET_QUESTION_GROUP_THREAD'));
    }
    
    onGetQuestionGroupThreads(message, client) {
      const questionGroupId = this.models.toUuid(message['question-group-id']);
      // TODO: Permission to list threads
      
      this.getUserId(client)
        .then((userId) => {
          this.models.findQuestionGroup(questionGroupId)
            .then((questionGroup) => {
              const userIds = _.keys(questionGroup.userThreads||{});
              const threadIds = _.values(questionGroup.userThreads||{});
              this.getUserMap(_.uniq(userIds))
                .then((userMap) => {
                  const threadPromises = _.map(threadIds, (threadId, index) => {
                    const thread = this.models.findThread(threadId);
                    const userId = userIds[index];
                    const user = userMap[userId];
                    return {
                      id: thread.id,
                      title: this.getUserDisplayName(user),
                      type: thread.type,
                      imagePath: this.getUserImage(user)
                    };
                  });

                  Promise.all(threadPromises)
                    .then((threads) => {
                      client.sendMessage({
                        "type": "question-group-threads-added",
                        "data": {
                          'question-group-id': questionGroupId,
                          'threads': threads
                        }
                      });
                    })
                    .catch(this.handleWebSocketError(client, 'GET_QUESTION_GROUP_THREADS'));
                })
                .catch(this.handleWebSocketError(client, 'GET_QUESTION_GROUP_THREADS'));
            })
            .catch(this.handleWebSocketError(client, 'GET_QUESTION_GROUP_THREADS'));
        })
        .catch(this.handleWebSocketError(client, 'GET_QUESTION_GROUP_THREADS'));
    }
    
    onGetMessages(message, client) {
      const threadId = this.models.toUuid(message['thread-id']);
      const firstResult = message['first-result'];
      const maxResults = message['max-results'];
      
      this.models.listMessagesByThreadId(threadId, firstResult, maxResults)
        .then((messages) => {
          client.sendMessage({
            "type": "messages-added",
            "data": {
              messages: _.flatten(messages)
            }
          });
        })
        .catch(this.handleWebSocketError(client, 'GET_MESSAGES'));
    }
    
    onMessage(event) {
      const message = event.data.message;
      const client = event.client;
      
      switch (message.type) {
        case 'send-message':
          this.onSendMessage(message, client);
        break;
        case 'get-messages':
          this.onGetMessages(message, client);
        break;
        case 'get-threads':
          this.onGetThreads(message, client);
        break;
        case 'get-question-groups':
          this.onGetQuestionGroups(message, client);
        break;
        case 'select-question-group-thread':
          this.onSelectQuestionGroupThread(message, client);
        break;
        case 'get-question-group-threads':
          this.onGetQuestionGroupThreads(message, client);
        break;
        case 'get-news':
          this.onGetNews(message, client);
        break;
        default:
          this.logger.error(util.format("Unknown message type %s", message.type));
        break;
      }
    }
    
    getQuestionGroupRole(questionGroup, userGroupIds) {
      let result = null;
      
      userGroupIds.forEach((userGroupId) => {
        const role = questionGroup.userGroupRoles[userGroupId];
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
    
    getUserId(client) {
      return new Promise((resolve, reject) => {
        this.models.findSession(this.models.toUuid(client.getSessionId()))
          .then((session) => {
            resolve(session.userId);
          })
          .catch(reject);
      });
    }
    
    getUserMap(userIds) {
      return new Promise((resolve, reject) => {
        const userPromises = _.map(userIds, (userId) => {
          return this.getUser(userId);
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
      // TODO: Implement
      return null;
    }
    
    getUser(userId) {
      return new Promise((resolve, reject) => {
        this.userManagement.findUser(config.get('keycloak:realm'), userId)
          .then((user) => {
            resolve(user);
          })
          .catch(reject);
      });
    }
    
    getUserGroupIds(client) {
      return new Promise((resolve, reject) => {
        this.getUserId(client)
          .then((userId) => {
            this.userManagement.listUserGroupIds(config.get('keycloak:realm'), userId)
              .then((userGroupIds) => {
                resolve(userGroupIds);
              })
              .catch(reject);
          })
          .catch(reject);
      });
    }
    
    register(webSockets) {
      webSockets.on("message", this.onMessage.bind(this));
    }
    
  };

  module.exports = (options, imports, register) => {
    const logger = imports.logger;
    const models = imports['pakkasmarja-berries-models'];
    const shadyMessages = imports['shady-messages'];
    const userManagement = imports['pakkasmarja-berries-user-management'];
    const wordpress = imports['pakkasmarja-berries-wordpress'];
    const websocketMessages = new PakkasmarjaBerriesWebsocketMessages(logger, models, shadyMessages, userManagement, wordpress);
    
    register(null, {
      'pakkasmarja-berries-ws-messages': websocketMessages
    });
  };

})();
