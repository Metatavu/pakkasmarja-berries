/*jshint esversion: 6 */
/* global __dirname */

(() => {
  "use strict";
  
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
          
          this.userManagement.checkPermissionToPostThread(config.get("keycloak:admin:realm"), userId, threadId)
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
              this.userManagement.getThreadUserIds(config.get("keycloak:admin:realm"), thread.id)
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
                          this.userManagement.listGroupsMemberIds(config.get("keycloak:admin:realm"), questionGroupUserGroupIds)
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
    
    /**
     * Fetches conversation threads for logged user
     * 
     * @param {Object} message 
     * @param {Object} client 
     */
    async onGetConversationThreads(message, client) {
      try {
        const userId = await this.getUserId(client);
        const userGroupIds = await this.getUserGroupIds(client, userId);
        const data = _.flatten(await Promise.all(_.map(userGroupIds, (userGroupId) => {
          return this.models.listConversationThreadsByUserGroupId(userGroupId);
        })));
        
        const itemReadMap = await this.getItemReadMap(userId, _.map(data, (thread) => { return `thread-${thread.id}`; }));

        const threads = await Promise.all(_.map(data, async (thread) => {
          const threadRead = itemReadMap[`thread-${thread.id}`];
          const answerType = thread.answerType;
          const predefinedTexts = answerType === "SELECT" ? (await this.models.listThreadPredefinedTextsByThreadId(thread.id)).map((threadPredefinedText) => {
            return threadPredefinedText.text;
          }) : [];

          return {
            "id": thread.id,
            "title": thread.title,
            "description": thread.description,
            "type": thread.type,
            "imageUrl": thread.imageUrl,
            "latestMessage": thread.latestMessage,
            "answerType": answerType,
            "predefinedTexts": predefinedTexts,
            "read": !thread.latestMessage || (threadRead && threadRead.getTime() >= thread.latestMessage.getTime())
          };
        }));

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
      } catch (e) {
        console.error(e);
        this.handleWebSocketError(client, "GET_THREADS");
      }           
    }
    
    async onGetQuestionGroups(message, client) {
      try {
        const userId = await this.getUserId(client);
        const userGroupIds = await this.getUserGroupIds(client, userId);
        const questionGroupsResult = await this.models.listQuestionGroupsByUserGroupIds(userGroupIds);
        const questionGroupsData = _.flatten(questionGroupsResult);
        const questionGroupIds = questionGroupsData.map((questionGroup) => {return questionGroup.id; });
        const questionGroupRoleMaps = await this.models.getQuestionGroupsUserGroupRoleMaps(questionGroupIds);

        const questionGroupsUserThreads = await this.models.listQuestionGroupUserThreadsByQuestionGroupIds(questionGroupIds);
        const questionGroupItemReadPromises = [];
        const questionGroups = await Promise.all(questionGroupsData.map(async (questionGroup) => {
          const role = this.userManagement.getUserGroupRole(questionGroupRoleMaps[questionGroup.id], userGroupIds);
          const allUserThreads = questionGroupsUserThreads.filter(questionGroupsUserThread => questionGroupsUserThread.questionGroupId === questionGroup.id );
          const userThreads = role === "manager" ? allUserThreads : allUserThreads.filter(filteredUserThread => filteredUserThread.userId === userId);
          const userThreadIds = _.map(userThreads, "threadId");
          const latestMessage = await this.models.getLatestMessageCreatedByThreadIds(userThreadIds); 

          questionGroupItemReadPromises.push(this.getThreadsHasUnreadMessages(userId, userThreadIds));

          return {
            id: questionGroup.id,
            title: questionGroup.title,
            originId: questionGroup.originId,
            imageUrl: questionGroup.imageUrl,
            latestMessage: latestMessage,
            role: role
          };
        }));

        const questionGroupItemReads = await Promise.all(questionGroupItemReadPromises);
        questionGroupItemReads.forEach((itemRead, index) => {
          questionGroups[index].read = !itemRead;
        });

        questionGroups.sort((a, b) => {
          let latestA = a.latestMessage ? a.latestMessage.getTime() : 0;
          let latestB = b.latestMessage ? b.latestMessage.getTime() : 0;
          return latestB - latestA;
        });

        client.sendMessage({
          "type": "question-groups-added",
          "data": {
            "question-groups": questionGroups
          }
        });
      } catch (e) {
        console.error(e);
        this.handleWebSocketError(client, "GET_QUESTION_GROUPS");
      }
    }
    
    async onSelectQuestionGroupThread(message, client) {
      try {
        const questionGroupId = message['question-group-id'];
        const userId = await this.getUserId(client);
        const questionGroup = await this.models.findQuestionGroup(questionGroupId);
        const data = await this.models.findOrCreateQuestionGroupUserThreadByQuestionGroupIdAndUserId(questionGroup.id, userId);
        const thread = data.thread;
        const created = data.created;
        client.sendMessage({
          "type": "question-thread-selected",
          "data": {
            "thread-id": thread.id
          }
        });

        if (created) {
          const managerUserGroupIds = await this.models.getQuestionGroupManagerUserGroupIds(questionGroup.id)
          const user = await this.userManagement.findUser(userId);
          const userIds = await this.userManagement.listGroupsMemberIds(config.get("keycloak:admin:realm"), managerUserGroupIds);
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
        }
      } catch (e) {
        console.error(e);
        this.handleWebSocketError(client, "GET_QUESTION_GROUP_THREAD");
      }
    }
    
    async onGetQuestionGroupThreads(message, client) {
      try {
        const questionGroupId = message["question-group-id"];
        const keycloakRealm = config.get("keycloak:admin:realm");
        const userId = await this.getUserId(client);
        const permission = await this.userManagement.checkPermissionToListQuestionGroupThreads(keycloakRealm, userId, questionGroupId);
        if (!permission) {
          this.logger.warn(`User ${userId} attempted to list threads from question group ${questionGroupId}`);
          return;
        }
        const questionGroupUserThreads = await this.models.listQuestionGroupUserThreadsByQuestionGroupId(questionGroupId);
        const userIds = _.map(questionGroupUserThreads, 'userId');
        const threadIds = _.map(questionGroupUserThreads, 'threadId');
        const userMap = await this.userManagement.getUserMap(_.uniq(userIds));
        const itemReadMap = await this.getItemReadMap(userId, _.map(threadIds, (threadId) => { return `thread-${threadId}`; }));
        const threadUserIdMap = {};
        threadIds.forEach((threadId, index) => {
          threadUserIdMap[threadId] = userIds[index];
        });

        const threadDatas = await this.models.findThreads(threadIds);
        const threads = [];
        threadDatas.forEach((thread) => {
          let userId = threadUserIdMap[thread.id];
          let user = userMap[userId];
          if (user) {
            let threadRead = itemReadMap[`thread-${thread.id}`];
            threads.push({
              id: thread.id,
              latestMessage: thread.latestMessage,
              title: this.userManagement.getUserDisplayName(user),
              type: thread.type,
              imageUrl: this.userManagement.getUserImage(user),
              read: !thread.latestMessage || (threadRead && threadRead.getTime() >= thread.latestMessage)
            });
          }
        });

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
      } catch (e) {
        console.error(e);
        this.handleWebSocketError(client, "GET_QUESTION_GROUP_THREADS");
      }
    }
    
    onGetMessages(message, client) {
      const threadId = message['thread-id'];
      const firstResult = message['first-result'];
      const maxResults = message['max-results'];
      const keycloakRealm = config.get("keycloak:admin:realm");
      
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
                          this.userManagement.getUserMap(userIds)
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
    
    onDeleteMessage(message, client) {
      const messageId = message.id;
          
      this.getUserId(client)
        .then((userId) => {
          return this.userManagement.checkPermissionToDeleteMessages(config.get("keycloak:admin:realm"), userId, messageId)
            .then((permission) => {
              if (!permission) {
                this.logger.warn(`User ${userId} attempted to delete message ${messageId}`);
                return;
              }
              
              return this.models.deleteMessageAttachmentsByMessageId(messageId)
                .then(() => {
                  return this.models.deleteMessage(messageId);
                });
            });
        })
        .then(() => {
          this.clusterMessages.sendMessageDeleted(messageId);
        })
        .catch(this.handleWebSocketError(client, 'DELETE_MESSAGE'));
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
    
    async onGetQuestionsUnreadStatus(message, client) {
      const questionsRead = await this.getUserItemRead(client, "questions"); 
      if (!questionsRead) {
        client.sendMessage({
          "type": "questions-unread",
          "data": { }
        });

        return;
      }

      try {
        const userId = await this.getUserId(client);
        const userGroupIds = await this.getUserGroupIds(client);
        const questionGroups = _.flatten(await Promise.all(_.map(userGroupIds, (userGroupId) => {
          return this.models.listQuestionGroupsByUserGroupId(userGroupId);
        })));

        const questionGroupIds = questionGroups.map((questionGroup) => {
          return questionGroup.id;
        });

        const questionGroupsUserThreads = await this.models.listQuestionGroupUserThreadsByQuestionGroupIds(questionGroupIds);
        const questionGroupRoleMaps = await this.models.getQuestionGroupsUserGroupRoleMaps(questionGroupIds);
        let unread = false;

        for (let i = 0; i < questionGroups.length; i++) {
          if (!unread) {
            const questionGroup = questionGroups[i];
            const questionGroupId = questionGroup.id;
            const role = this.userManagement.getUserGroupRole(questionGroupRoleMaps[questionGroupId], userGroupIds);
            const allUserThreads = questionGroupsUserThreads.filter(questionGroupsUserThread => questionGroupsUserThread.questionGroupId === questionGroup.id );
            const userThreads = role === "manager" ? allUserThreads : allUserThreads.filter(filteredUserThread => filteredUserThread.userId === userId);
            const userThreadIds = _.map(userThreads, "threadId");
            const latestMessage = await this.models.getLatestMessageCreatedByThreadIds(userThreadIds);

            if (latestMessage && latestMessage.getTime() > questionsRead.getTime()) {
              unread = true;
            }
          }
        }

        if (unread) {
          client.sendMessage({
            "type": "questions-unread",
            "data": { }
          }); 
        }

      } catch (e) {
        this.handleWebSocketError(client, "GET_QUESTIONS_UNREAD_STATUS");
      }
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
        case 'delete-message':
          this.onDeleteMessage(message, client);
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
        return this.userManagement.getThreadUserRole(config.get("keycloak:admin:realm"), thread.id, userId);
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
          this.userManagement.listUserGroupIds(config.get("keycloak:admin:realm"), userId)
            .then((userGroupIds) => {
              resolve(userGroupIds);
            })
            .catch(reject);
        } else {
          this.getUserId(client)
            .then((userId) => {
              this.userManagement.listUserGroupIds(config.get("keycloak:admin:realm"), userId)
                .then((userGroupIds) => {
                  resolve(userGroupIds);
                })
                .catch(reject);
            })
            .catch(reject);
        }        
      });
    }
    
    async getThreadsHasUnreadMessages(userId, threadIds) {
      const itemReads = await this.models.findItemReads(threadIds.map((threadId) => { return `thread-${threadId}`; }), userId);
      const itemReadsLookup = _.keyBy(itemReads, "itemId");
      const threads = await this.models.findThreads(threadIds);
      let result = false;
      
      for(let i = 0; i < threads.length; i++) {
        let thread = threads[i];
        if (!thread.latestMessage) {
          continue;
        }
        
        let itemRead = itemReadsLookup[`thread-${thread.id}`];
        if (!itemRead || thread.latestMessage.getTime() > itemRead.updatedAt.getTime()) {
          result = true;
          break;
        }
      }
      
      return result;
    }
    
    async getItemReadMap(userId, ids) {
      const readItems = await this.models.findItemReads(ids, userId);
      const result = {};
      readItems.forEach((readItem) => {
        result[readItem.itemId] = readItem.updatedAt;
      });

      return result;
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
