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
    
    constructor (logger, models, shadyMessages, userManagement, clusterMessages, pakkasmarjaBerriesUtils) {
      this.logger = logger;
      this.models = models;
      this.shadyMessages = shadyMessages;
      this.userManagement = userManagement;
      this.clusterMessages = clusterMessages;
      this.pakkasmarjaBerriesUtils = pakkasmarjaBerriesUtils;
    }
    
    handleWebSocketError(client, operation) {
      return (err) => {
        const failedOperation = operation || 'UNKNOWN_OPERATION';
        this.logger.error(util.format('ERROR DURING OPERATION %s: %s', failedOperation, err));
        // TODO notify client
      };
    }
    
    onPing(message, client) {
      client.sendMessage({
        "type": "pong"
      });
    }
    
    onSendMessage(message, client) {
      this.getUserId(client)
        .then((userId) => {
          const threadId = message.threadId;
          const contents = message.contents;
          
          this.userManagement.checkPermissionToPostThread(config.get('keycloak:realm'), userId, threadId)
            .then((permission) => {
              if (!permission) {
                this.logger.warn(`User ${userId} attempted to post message into ${threadId}`);
                return;
              }
              
              this.models.findThread(threadId)
                .then((thread) => {
                  if (thread.type === 'conversation') {
                    this.onSendMessageConversation(userId, thread, contents, client);
                  } else if (thread.type === 'question') {
                    this.onSendMessageQuestion(userId, thread, contents, client);
                  } else {
                    this.logger.error(`Unknown thread type ${thread.type}`);
                  }
                })
                .catch(this.handleWebSocketError(client, 'SEND_MESSAGE'));
            })
            .catch(this.handleWebSocketError(client, 'SEND_MESSAGE'));
        })
        .catch(this.handleWebSocketError(client, 'SEND_MESSAGE'));
    }
    
    onSendMessageConversation(userId, thread, contents, client) {
      this.models.createMessage(thread.id, userId, contents)
        .then((message) => {
          const messageBuilder = this.clusterMessages.createMessageAddedBuilder();
          messageBuilder.thread(thread).message(message).send()
            .then(() => {
              this.userManagement.getThreadUserIds(config.get('keycloak:realm'), thread.id)
                .then((userIds) => {
                  this.pakkasmarjaBerriesUtils.buildPushNotification(userIds, 'Uusi viesti', `Uusi viesti keskustelussa ${thread.title}`, 'conversation-push-notifications');
                  this.models.upsertItemRead(`thread-${thread.id}`, userId)
                    .then(() => {})
                    .catch(this.handleWebSocketError(client, 'SEND_MESSAGE_QUESTION'));
                });
            })
            .catch(this.handleWebSocketError(client, 'SEND_MESSAGE_CONVERSATION'));
        })
        .catch(this.handleWebSocketError(client, 'SEND_MESSAGE_CONVERSATION')); 
    }
    
    onSendMessageQuestion(userId, thread, contents, client) {
      this.models.findQuestionGroupByThreadId(thread.id)
        .then((questionGroup) => {
          this.models.createMessage(thread.id, userId, contents)
            .then((message) => {
              this.clusterMessages.createMessageAddedBuilder()
                .thread(thread).message(message).send()
                .then(() => { 
                  
                  this.models.findQuestionGroupUserThreadsByThreadId(thread.id)
                    .then((questionGroupUserThreads) => {
                      const questionGroupId = questionGroupUserThreads[0].questionGroupId;
                      const threadUserIds = questionGroupUserThreads.map((questionGroupUserThread) => {
                        return questionGroupUserThread.userId;
                      });
                      
                      this.models.getQuestionGroupManagerUserGroupIds(questionGroupId)
                        .then((questionGroupUserGroupIds) => {
                          this.userManagement.listGroupsMemberIds(config.get('keycloak:realm'), questionGroupUserGroupIds)
                          .then((questionGroupUserIds) => {
                            const userIds = _.uniq(threadUserIds.concat(questionGroupUserIds));
                            this.pakkasmarjaBerriesUtils.buildPushNotification(userIds, 'Uusi viesti kysymysryhmässä', questionGroup.title, 'question-push-notifications');
                            this.models.upsertItemRead(`thread-${thread.id}`, userId)
                              .then(() => {})
                              .catch(this.handleWebSocketError(client, 'SEND_MESSAGE_QUESTION'));
                          });
                        });
                    });
                })
                .catch(this.handleWebSocketError(client, 'SEND_MESSAGE_QUESTION'));
            })
            .catch(this.handleWebSocketError(client, 'SEND_MESSAGE_QUESTION'));
        })
        .catch(this.handleWebSocketError(client, 'SEND_MESSAGE_QUESTION'));
    }
    
    onGetNews(message, client) {
      const page = message.page;
      const perPage = message.perPage;
      
      this.getUserId(client)
        .then((userId) => {
          this.models.listNewsArticles(page * perPage, perPage)
            .then((newsArticles) => {
              this.getItemReadMap(userId, _.map(newsArticles, (newsArticle) => { return `news-article-${newsArticle.id}`; }))
                .then((itemReadMap) => {
                  client.sendMessage({
                    "type": "news-items-added",
                    "data": {
                      items: _.map(newsArticles, (newsArticle) => {
                        const newsArticleRead = itemReadMap[`news-article-${newsArticle.id}`];
                        return {
                          "id": newsArticle.id,
                          "contents": newsArticle.contents,
                          "title": newsArticle.title,
                          "created": moment(newsArticle.createdAt).format(),
                          "modified": moment(newsArticle.modifiedAt || newsArticle.createdAt).format(),
                          "image": newsArticle.imageUrl,
                          "read": newsArticleRead && newsArticleRead.getTime() >= newsArticle.createdAt.getTime()
                        };
                      })
                    }
                  });
                })
                .catch(this.handleWebSocketError(client, 'GET_NEWS'));
            })
            .catch(this.handleWebSocketError(client, 'GET_NEWS'));
        })
        .catch(this.handleWebSocketError(client, 'GET_NEWS'));
    }
    
    onGetConversationThreads(message, client) {
      this.getUserId(client)
        .then((userId) => {
          this.getUserGroupIds(client, userId)
            .then((userGroupIds) => {
              const threadPromises = _.map(userGroupIds, (userGroupId) => {
                return this.models.listConversationThreadsByUserGroupId(userGroupId);
              });

              Promise.all(threadPromises)
                .then((datas) => {
                  const data = _.flatten(datas);
          
                  this.getItemReadMap(userId, _.map(data, (thread) => { return `thread-${thread.id}`; }))
                    .then((itemReadMap) => {
                      const threads = _.map(data, (thread) => {
                        const threadRead = itemReadMap[`thread-${thread.id}`];
                        return {
                          'id': thread.id,
                          'title': thread.title,
                          'type': thread.type,
                          'imageUrl': thread.imageUrl,
                          'latestMessage': thread.latestMessage,
                          'read': !thread.latestMessage || (threadRead && threadRead.getTime() >= thread.latestMessage.getTime())
                        };
                      });
                      
                      threads.sort((a, b) => {
                        let latestA = a.latestMessage ? a.latestMessage.getTime() : 0;
                        let latestB = b.latestMessage ? b.latestMessage.getTime() : 0;
                        return latestB - latestA;
                      });
                      
                      client.sendMessage({
                        "type": "conversation-threads-added",
                        "data": {
                          threads: threads
                        }
                      });
                    });
                })
                .catch(this.handleWebSocketError(client, 'GET_THREADS'));
            })
            .catch(this.handleWebSocketError(client, 'GET_THREADS'));
      });
    }
    
    onGetQuestionGroups(message, client) {
      this.getUserId(client)
        .then((userId) => {
          this.getUserGroupIds(client, userId)
            .then((userGroupIds) => {
              const questionGroupPromises = _.map(userGroupIds, (userGroupId) => {
                return this.models.listQuestionGroupsByUserGroupId(userGroupId);
              });
              Promise.all(questionGroupPromises)
                .then((questionGroupsResult) => {
                  const questionGroupsData = _.flatten(questionGroupsResult);
                  const rolePromises = _.map(questionGroupsData, (questionGroup) => {
                    return this.models.getQuestionGroupUserGroupRoleMap(questionGroup.id)
                      .then((userGroupRoleMap) => {
                        return this.userManagement.getUserGroupRole(userGroupRoleMap, userGroupIds);
                      });
                  });

                  Promise.all(rolePromises)
                    .then((roles) => {
                      const questionGroups = _.map(questionGroupsData, (questionGroup, index) => {
                        return {
                          id: questionGroup.id,
                          title: questionGroup.title,
                          originId: questionGroup.originId,
                          imageUrl: questionGroup.imageUrl,
                          latestMessage: questionGroup.latestMessage,
                          role: roles[index]
                        };
                      });

                      questionGroups.sort((a, b) => {
                        let latestA = a.latestMessage ? a.latestMessage.getTime() : 0;
                        let latestB = b.latestMessage ? b.latestMessage.getTime() : 0;
                        return latestB - latestA;
                      });

                      const threadsReadPromises = _.map(questionGroups, (questionGroup, index) => {
                        return this.models.listQuestionGroupUserThreadsByQuestionGroupId(questionGroup.id)
                          .then((questionGroupUserThreads) => {
                            let threadIds = [];

                            if (questionGroup.role === 'manager') {
                              threadIds = _.map(questionGroupUserThreads, 'threadId');
                            } else {
                              _.forEach(questionGroupUserThreads, (questionGroupUserThread) => {
                                if (questionGroupUserThread.userId === userId) {
                                  threadIds.push(questionGroupUserThread.threadId);
                                }
                              });
                            }

                            return this.getThreadsHasUnreadMessages(userId, threadIds);
                          });
                      });

                      Promise.all(threadsReadPromises)
                        .then((threadsHasUnreadMessages) => {
                          client.sendMessage({
                            "type": "question-groups-added",
                            "data": {
                              'question-groups': _.map(questionGroups, (questionGroup, index) => {
                                return Object.assign(questionGroup, {
                                  read: !threadsHasUnreadMessages[index]
                                });
                              })
                            }
                          });
                        });                      
                    });
                })
                .catch(this.handleWebSocketError(client, 'GET_QUESTION_GROUPS'));
            })
            .catch(this.handleWebSocketError(client, 'GET_QUESTION_GROUPS'));
        })
        .catch(this.handleWebSocketError(client, 'GET_QUESTION_GROUPS'));
    }
    
    onSelectQuestionGroupThread(message, client) {
      const questionGroupId = message['question-group-id'];
      this.getUserId(client)
        .then((userId) => {
          this.models.findQuestionGroup(questionGroupId)
            .then((questionGroup) => {
              this.models.findOrCreateQuestionGroupUserThreadByQuestionGroupIdAndUserId(questionGroup.id, userId)
                .then((data) => {
                  const thread = data.thread;
                  const created = thread.createdAt;
                  client.sendMessage({
                    "type": "question-thread-selected",
                    "data": {
                      'thread-id': thread.id
                    }
                  });
                  
                  if (created) {
                    this.models.getQuestionGroupManagerUserGroupIds(questionGroup.id)
                      .then((managerUserGroupIds) => {
                        this.userManagement.findUser(config.get('keycloak:realm'), userId)
                          .then((user) => {
                            this.userManagement.listGroupsMemberIds(config.get('keycloak:realm'), managerUserGroupIds)
                              .then((userIds) => {
                                userIds.forEach((userId) => {
                                  this.shadyMessages.trigger("client:question-group-thread-added", {
                                    'question-group-id': questionGroupId,
                                    'thread': {
                                      id: thread.id,
                                      latestMessage: thread.latestMessage,
                                      title: this.userManagement.getUserDisplayName(user),
                                      type: thread.type,
                                      imageUrl: this.userManagement.getUserImage(user)
                                    },
                                    'user-id': userId
                                  });
                                });
                              })
                              .catch(this.handleWebSocketError(client, 'GET_QUESTION_GROUP_THREAD'));
                          })
                          .catch(this.handleWebSocketError(client, 'GET_QUESTION_GROUP_THREAD'));                        
                      });
                  }
                })
                .catch(this.handleWebSocketError(client, 'GET_QUESTION_GROUP_THREAD'));
            })
            .catch(this.handleWebSocketError(client, 'GET_QUESTION_GROUP_THREAD'));
        })
        .catch(this.handleWebSocketError(client, 'GET_QUESTION_GROUP_THREAD'));
    }
    
    onGetQuestionGroupThreads(message, client) {
      const questionGroupId = message['question-group-id'];
      const keycloakRealm = config.get('keycloak:realm');
              
      this.getUserId(client)
        .then((userId) => {
          this.userManagement.checkPermissionToListQuestionGroupThreads(keycloakRealm, userId, questionGroupId)
            .then((permission) => {
              if (!permission) {
                this.logger.warn(`User ${userId} attempted to list threads from question group ${questionGroupId}`);
                return;
              }
              
              this.models.listQuestionGroupUserThreadsByQuestionGroupId(questionGroupId)
                .then((questionGroupUserThreads) => {
                  const userIds = _.map(questionGroupUserThreads, 'userId');
                  const threadIds = _.map(questionGroupUserThreads, 'threadId');
                  this.userManagement.getUserMap(keycloakRealm, _.uniq(userIds))
                    .then((userMap) => {
                      this.getItemReadMap(userId, _.map(threadIds, (threadId) => { return `thread-${threadId}`; }))
                        .then((itemReadMap) => {
                          const threadPromises = _.map(threadIds, (threadId, index) => {
                            return new Promise((resolve, reject) => {
                              this.models.findThread(threadId)
                                .then((thread) => {
                                  const userId = userIds[index];
                                  const user = userMap[userId];
                                  const threadRead = itemReadMap[`thread-${thread.id}`];

                                  resolve({
                                    id: thread.id,
                                    latestMessage: thread.latestMessage,
                                    title: this.userManagement.getUserDisplayName(user),
                                    type: thread.type,
                                    imageUrl: this.userManagement.getUserImage(user),
                                    read: !thread.latestMessage || (threadRead && threadRead.getTime() >= thread.latestMessage)
                                  });
                                })
                                .catch(reject);
                            });
                          });

                          Promise.all(threadPromises)
                            .then((threads) => {
                              
                              threads.sort((a, b) => {
                                let latestA = a.latestMessage ? a.latestMessage.getTime() : 0;
                                let latestB = b.latestMessage ? b.latestMessage.getTime() : 0;
                                return latestB - latestA;
                              });
                              
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
            })
            .catch(this.handleWebSocketError(client, 'GET_QUESTION_GROUP_THREADS'));
        })
        .catch(this.handleWebSocketError(client, 'GET_QUESTION_GROUP_THREADS'));
    }
    
    onGetMessages(message, client) {
      const threadId = message['thread-id'];
      const firstResult = message['first-result'];
      const maxResults = message['max-results'];
      const keycloakRealm = config.get('keycloak:realm');
      
      this.getUserId(client)
        .then((userId) => {
          this.userManagement.checkPermissionToReadThread(keycloakRealm, userId, threadId)
            .then((permission) => {
              if (!permission) {
                this.logger.warn(`User ${userId} attempted to post message into ${threadId}`);
                return;
              }
              
              this.models.findThread(threadId)
                .then((thread) => {
                  this.models.listMessagesByThreadId(threadId, firstResult, maxResults)
                    .then((data) => {
                      const messages = _.flatten(data);
                      const userIds = _.uniq(_.map(messages, 'userId'));
                      this.getThreadRoleMap(thread, userIds)
                        .then((roleMap) => {
                          this.userManagement.getUserMap(keycloakRealm, userIds)
                            .then((userMap) => {
                              client.sendMessage({
                                "type": "messages-added",
                                "data": {
                                  "messages": _.map(messages, (message) => {
                                    const role = roleMap[message.userId];
                                    return this.translateMessage(message, userMap[message.userId], role);
                                  }),
                                  "thread-id": thread.id,
                                  "thread-type": thread.type
                                }
                              });                  
                            })
                            .catch(this.handleWebSocketError(client, 'GET_MESSAGES'));
                        })
                        .catch(this.handleWebSocketError(client, 'GET_MESSAGES'));
                    })
                    .catch(this.handleWebSocketError(client, 'GET_MESSAGES'));
                })
                .catch(this.handleWebSocketError(client, 'GET_MESSAGES'));
            })
            .catch(this.handleWebSocketError(client, 'GET_MESSAGES'));
        });
    }
    
    onMarkItemRead(message, client) {
      const id = message.id;
      
      this.getUserId(client)
        .then((userId) => {
          this.models.upsertItemRead(id, userId)
            .then(() => {})
            .catch(this.handleWebSocketError(client, 'MARK_ITEM_READ'));
        })
        .catch(this.handleWebSocketError(client, 'MARK_ITEM_READ'));
    }
    
    onUserSettingsChanged(message, client) {
      this.getUserId(client)
        .then((userId) => {
          const newUserSettings = message['userSettings'];
          const settingUpsertPromises = _.map(newUserSettings, (settingValue, settingKey) => {
            return this.models.upsertUserSetting(userId, settingKey, settingValue);
          });
          
          Promise.all(settingUpsertPromises)
            .then(() => {})
            .catch(this.handleWebSocketError(client, 'USER_SETTINGS_CHANGED'));
        })
        .catch(this.handleWebSocketError(client, 'USER_SETTINGS_CHANGED'));
    }
    
    onGetUserSettings(message, client) {
      this.getUserId(client)
        .then((userId) => {
          this.models.getUserSettings(userId)
          .then((userSettings) => {
            const result = userSettings.map((userSetting) => {
              return { settingKey: userSetting.settingKey, settingValue: userSetting.settingValue };
            });
            client.sendMessage({
              "type": "user-settings",
              "data": {
                userSettings: result
              }
            });  
          })
          .catch(this.handleWebSocketError(client, 'GET_USER_SETTINGS'));
        })
        .catch(this.handleWebSocketError(client, 'GET_USER_SETTINGS'));
    }
    
    onGetConversationsUnreadStatus(message, client) {
      this.getUserItemRead(client, 'conversations')
        .then((conversationsRead) => {
          if (!conversationsRead) {
            client.sendMessage({
              "type": "conversations-unread",
              "data": { }
            });
          } else {
            this.getUserGroupIds(client)
              .then((userGroupIds) => {
                const threadPromises = _.map(userGroupIds, (userGroupId) => {
                  return this.models.listConversationThreadsByUserGroupId(userGroupId);
                });

                Promise.all(threadPromises)
                  .then((data) => {
                    let unread = false;
                    
                    const threads = _.flatten(data);
                    _.forEach(threads, (thread) => {
                      if (thread.latestMessage && thread.latestMessage.getTime() > conversationsRead.getTime()) {
                        unread = true;
                      }
                    });
                    
                    if (unread) {
                      client.sendMessage({
                        "type": "conversations-unread",
                        "data": { }
                      }); 
                    }
                  })
                  .catch(this.handleWebSocketError(client, 'GET_CONVERSATIONS_UNREAD_STATUS'));
              })
              .catch(this.handleWebSocketError(client, 'GET_CONVERSATIONS_UNREAD_STATUS'));            
          }
        });
    }
    
    onGetQuestionsUnreadStatus(message, client) {
      this.getUserItemRead(client, 'questions')
        .then((questionsRead) => {
          if (!questionsRead) {
            client.sendMessage({
              "type": "questions-unread",
              "data": { }
            });
          } else {
            this.getUserGroupIds(client)
              .then((userGroupIds) => {
                const questionGroupPromises = _.map(userGroupIds, (userGroupId) => {
                  return this.models.listQuestionGroupsByUserGroupId(userGroupId);
                });

                Promise.all(questionGroupPromises)
                  .then((data) => {
                    let unread = false;

                    const groups = _.flatten(data);
                    _.forEach(groups, (group) => {
                      if (group.latestMessage && group.latestMessage.getTime() > questionsRead.getTime()) {
                        unread = true;
                      }
                    });

                    if (unread) {
                      client.sendMessage({
                        "type": "questions-unread",
                        "data": { }
                      }); 
                    }
                  })
                  .catch(this.handleWebSocketError(client, 'GET_QUESTIONS_UNREAD_STATUS'));
              })
              .catch(this.handleWebSocketError(client, 'GET_QUESTIONS_UNREAD_STATUS'));            
          }
        });
    }
    
    onMessage(event) {
      const message = event.data.message;
      const client = event.client;
      
      switch (message.type) {
        case 'ping':
          this.onPing(message, client);
        break;
        case 'send-message':
          this.onSendMessage(message, client);
        break;
        case 'get-messages':
          this.onGetMessages(message, client);
        break;
        case 'get-conversation-threads':
          this.onGetConversationThreads(message, client);
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
        case 'get-conversations-unread-status':
          this.onGetConversationsUnreadStatus(message, client);
        break;
        case 'get-questions-unread-status':
          this.onGetQuestionsUnreadStatus(message, client);
        break;
        case 'mark-item-read':
          this.onMarkItemRead(message, client);
        break;
        case 'user-settings-changed':
          this.onUserSettingsChanged(message, client);
        break;
        case 'get-user-settings':
          this.onGetUserSettings(message, client);
        break;
        default:
          this.logger.error(util.format("Unknown message type %s", message.type));
        break;
      }
    }
    
    getThreadRoleMap(thread, userIds) {
      const userRolePromises = _.map(userIds, (userId) => {
        return this.userManagement.getThreadUserRole(config.get('keycloak:realm'), thread.id, userId);
      });
      
      return Promise.all(userRolePromises)
        .then((roles) => {
          const result = {};
          
          _.forEach(userIds, (userId, index) => {
            result[userId] = roles[index];
          });
          
          return result;
        });
    }
    
    translateMessage(message, user, role) {             
      return {
        id: message.id,
        threadId: message.threadId,
        userId: message.userId,
        userName: this.userManagement.getUserDisplayName(user),  
        contents: message.contents,
        created: message.createdAt,
        modified: message.modifiedAt || message.createdAt,
        role: role
      };
    }
    
    getUserId(client) {
      return new Promise((resolve, reject) => {
        this.models.findSession(client.getSessionId())
          .then((session) => {
            resolve(session.userId);
          })
          .catch(reject);
      });
    }
    
    getUserGroupIds(client, userId) {
      return new Promise((resolve, reject) => {
        if (userId) {
          this.userManagement.listUserGroupIds(config.get('keycloak:realm'), userId)
            .then((userGroupIds) => {
              resolve(userGroupIds);
            })
            .catch(reject);
        } else {
          this.getUserId(client)
            .then((userId) => {
              this.userManagement.listUserGroupIds(config.get('keycloak:realm'), userId)
                .then((userGroupIds) => {
                  resolve(userGroupIds);
                })
                .catch(reject);
            })
            .catch(reject);
        }        
      });
    }
    
    getThreadsHasUnreadMessages(userId, threadIds) {
      const hasUnreadPromises = _.map(threadIds, (threadId) => {
        return this.getThreadHasUnreadMessages(userId, threadId);    
      });
      
      return new Promise((resolve, reject) => {
          Promise.all(hasUnreadPromises)
            .then((hasUnreads) => {
              let result = false;

              _.forEach(hasUnreads, (hasUnread) => {
                if (hasUnread) {
                  result = true;
                }
              });

              resolve(result);
            })
            .catch(reject);
      });
    }
    
    getThreadHasUnreadMessages(userId, threadId) {
      return new Promise((resolve, reject) => {
        this.getItemRead(userId, `thread-${threadId}`)
          .then((itemRead) => {
            if (!itemRead) {
              resolve(true);
            } else {
              this.models.findThread(threadId)
                .then((thread) => {
                  if (!thread) {
                    resolve(false);
                  } else {
                    resolve(!thread.latestMessage || (thread.latestMessage.getTime() > itemRead.getTime()));
                  }
                })
                .catch(reject);
            }
          })
          .catch(reject);
      });
    }
    
    getItemReadMap(userId, ids) {
      return new Promise((resolve, reject) => {
        const itemReadPromises = _.map(ids, (id) => {
          return this.getItemRead(userId, id);
        });

        Promise.all(itemReadPromises)
          .then((readItems) => {
            const result = {};

            _.forEach(ids, (id, index) => {
              const readItem = readItems[index];
              result[id] = readItem;
            });

            resolve(result);
          })
          .catch(reject);
      });
    }
    
    getItemRead(userId, id) {
      return new Promise((resolve, reject) => {
        this.models.findItemRead(id, userId)
          .then((itemRead) => {
            resolve(itemRead ? itemRead.updatedAt : null);
          })
          .catch(reject);
      });
    }
    
    getUserItemRead(client, id) {
      return new Promise((resolve, reject) => {
        this.getUserId(client)
          .then((userId) => {
            this.getItemRead(userId, id)
              .then(resolve)
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
    const clusterMessages = imports['pakkasmarja-berries-cluster-messages'];
    const pakkasmarjaBerriesUtils = imports['pakkasmarja-berries-utils'];
     
    const websocketMessages = new PakkasmarjaBerriesWebsocketMessages(logger, models, shadyMessages, userManagement, clusterMessages, pakkasmarjaBerriesUtils);
    
    register(null, {
      'pakkasmarja-berries-ws-messages': websocketMessages
    });
  };

})();
