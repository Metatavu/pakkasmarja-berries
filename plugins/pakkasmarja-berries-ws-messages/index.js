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
    
    constructor (logger, models, shadyMessages, userManagement, wordpress, clusterMessages) {
      this.logger = logger;
      this.models = models;
      this.shadyMessages = shadyMessages;
      this.userManagement = userManagement;
      this.wordpress = wordpress;
      this.clusterMessages = clusterMessages;
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

          const threadId = message.threadId;
          const contents = message.contents;

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
    }
    
    onSendMessageConversation(userId, thread, contents, client) {
      this.models.createMessage(thread.id, userId, contents)
        .then((message) => {
          const messageBuilder = this.clusterMessages.createMessageAddedBuilder();
          messageBuilder.thread(thread).message(message).send()
            .then(() => { })
            .catch(this.handleWebSocketError(client, 'SEND_MESSAGE_CONVERSATION'));
        })
        .catch(this.handleWebSocketError(client, 'SEND_MESSAGE_CONVERSATION')); 
    }
    
    onSendMessageQuestion(userId, thread, contents, client) {
      this.models.findQuestionGroupByThreadId(thread.id)
        .then((questionGroup) => {
          this.models.createMessage(thread.id, userId, contents)
            .then((message) => {
              this.models.updateGroupLastestMessage(questionGroup, new Date())
                .then(() => {
                  this.clusterMessages.createMessageAddedBuilder()
                    .thread(thread).message(message).send()
                    .then(() => { })
                    .catch(this.handleWebSocketError(client, 'SEND_MESSAGE_QUESTION'));
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
              this.getItemReadMap(userId, _.map(newsArticles, 'id'))
                .then((itemReadMap) => {
                  client.sendMessage({
                    "type": "news-items-added",
                    "data": {
                      items: _.map(newsArticles, (newsArticle) => {
                        const newsArticleRead = itemReadMap[newsArticle.id];
                        return {
                          "id": newsArticle.id,
                          "contents": newsArticle.contents,
                          "title": newsArticle.title,
                          "created": moment(newsArticle.createdAt).format(),
                          "modified": moment(newsArticle.modifiedAt || newsArticle.createdAt).format(),
                          "image": newsArticle.imageUrl,
                          "read": newsArticleRead && newsArticleRead.getTime() >= newsArticle.createdAt
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
          
                  this.getItemReadMap(userId, _.map(data, 'id'))
                    .then((itemReadMap) => {
                      const threads = _.map(data, (thread) => {
                        const threadRead = itemReadMap[thread.id];
                
                        return {
                          'id': thread.id,
                          'title': thread.title,
                          'type': thread.type,
                          'imageUrl': thread.imageUrl,
                          'latestMessage': thread.lastMessage,
                          'read': threadRead && threadRead.getTime() >= thread.latestMessage
                        };
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
                .then((datas) => {
                  const data = _.flatten(datas);
                  const rolePromises = _.map(data, (questionGroup) => {
                    return this.userManagement.getQuestionGroupUserRole(config.get('keycloak:realm'), questionGroup.id, userId);
                  });
                  
                  Promise.all(rolePromises)
                    .then((roles) => {
                      const questionGroups = _.map(data, (questionGroup, index) => {
                        return {
                          id: questionGroup.id,
                          title: questionGroup.title,
                          originId: questionGroup.originId,
                          imageUrl: questionGroup.imageUrl,
                          latestMessage: questionGroup.latestMessage,
                          role: roles[index]
                        };
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
      // TODO: Permission to list threads
      
      this.getUserId(client)
        .then((userId) => {
          this.models.listQuestionGroupUserThreadsByQuestionGroupId()
            .then((questionGroupUserThreads) => {
              const userIds = _.map(questionGroupUserThreads, 'userId');
              const threadIds = _.map(questionGroupUserThreads, 'threadId');
              
              this.userManagement.getUserMap(config.get('keycloak:realm'), _.uniq(userIds))
                .then((userMap) => {
                  this.getItemReadMap(userId, threadIds)
                    .then((itemReadMap) => {
                      const threadPromises = _.map(threadIds, (threadId, index) => {
                        return new Promise((resolve, reject) => {
                          this.models.findThread(threadId)
                            .then((thread) => {
                              const userId = userIds[index];
                              const user = userMap[userId];
                              const threadRead = itemReadMap[thread.id];
                              
                              resolve({
                                id: thread.id,
                                latestMessage: thread.latestMessage,
                                title: this.userManagement.getUserDisplayName(user),
                                type: thread.type,
                                imageUrl: this.userManagement.getUserImage(user),
                                read: threadRead && threadRead.getTime() >= thread.latestMessage
                              });
                            })
                            .catch(reject);
                        });
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
        })
        .catch(this.handleWebSocketError(client, 'GET_QUESTION_GROUP_THREADS'));
    }
    
    onGetMessages(message, client) {
      const threadId = message['thread-id'];
      const firstResult = message['first-result'];
      const maxResults = message['max-results'];
      
      this.models.findThread(threadId)
        .then((thread) => {
          this.models.listMessagesByThreadId(threadId, firstResult, maxResults)
            .then((data) => {
              const messages = _.flatten(data);
              const userIds = _.uniq(_.map(messages, 'userId'));
              this.getThreadRoleMap(thread, userIds)
                .then((roleMap) => {
                  this.userManagement.getUserMap(config.get('keycloak:realm'), userIds)
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
                  return this.models.listConversationThreadsUserGroupId(userGroupId);
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
        this.getItemRead(userId, threadId)
          .then((itemRead) => {
            if (!itemRead) {
              resolve(true);
            } else {
              this.models.findThread(threadId)
                .then((thread) => {
                  if (!thread) {
                    resolve(false);
                  } else {
                    resolve(thread.latestMessage.getTime() > itemRead.getTime());
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
            resolve(itemRead ? itemRead.time : null);
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
    const wordpress = imports['pakkasmarja-berries-wordpress'];
    const clusterMessages = imports['pakkasmarja-berries-cluster-messages'];
    const websocketMessages = new PakkasmarjaBerriesWebsocketMessages(logger, models, shadyMessages, userManagement, wordpress, clusterMessages);
    
    register(null, {
      'pakkasmarja-berries-ws-messages': websocketMessages
    });
  };

})();
