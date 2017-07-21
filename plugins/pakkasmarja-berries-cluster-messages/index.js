/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';
  
  const util = require('util'); 
  const moment = require('moment');
  const config = require('nconf');
  const uuid = require('uuid4');
  const _ = require('lodash');
  const Promise = require('bluebird');
  
  class MessageAddedBuilder {
    
    constructor (models, shadyMessages, userManagement) {
      this.models = models;
      this.shadyMessages = shadyMessages;
      this.userManagement = userManagement;
    }
    
    messageId(messageId) {
      this._messageId = messageId;
      return this;
    }
    
    message(message) {
      this._message = message;
      return this;
    }
    
    threadId(threadId) {
      this._threadId = threadId;
      return this;
    }
    
    thread(thread) {
      this._thread = thread;
      return this;
    }
    
    questionGroup(questionGroup) {
      this._questionGroup = questionGroup;
      return this;
    }
    
    user(user) {
      this._user = user;
      return this;
    }
    
    role(role) {
      this._role = role;
      return this;
    }
    
    threadUserIds(threadUserIds) {
      this._threadUserIds = threadUserIds;
      return this;
    }
    
    userGroupIds(userGroupIds) {
      this._userGroupIds = userGroupIds;
    }
    
    translateMessage(message, user, role) {             
      return {
        id: message.id,
        threadId: message.threadId,
        userId: message.userId,
        userName: this.userManagement.getUserDisplayName(user),  
        contents: message.contents,
        created: message.createdAt,
        modified: message.modifiedAt || message.createdAt,
        role: role
      };
    }
    
    send() {
      return new Promise((resolve, reject) => {
        this._resolveMessage()
          .then((message) => {
            this._resolveThread()
              .then((thread) => {
                this._resolveUser()
                  .then((user) => {
                    this._resolveRole()
                      .then((role) => {
                        this._resolveThreadUserIds()
                          .then((threadUserIds) => {
                            _.forEach(threadUserIds, (threadUserId) => {
                              this.shadyMessages.trigger("client:message-added", {
                                "user-id": threadUserId,
                                "message": this.translateMessage(message, user, role),
                                "thread-id": thread.id,
                                "thread-type": thread.type
                              });
                            });
                            
                            resolve();
                          }) 
                          .catch(reject);                            
                      })
                      .catch(reject);
                  })
                  .catch(reject);
              })
              .catch(reject);
          })
          .catch(reject);
      });
    }
    
    _resolveUser() {
      return new Promise((resolve, reject) => {
        if (this._user) {
          resolve(this._user);
        } else {
          this._resolveMessage()
            .then((message) => {
              if (message) {
                this.userManagement.findUser(config.get('keycloak:realm'), message.userId)
                  .then((user) => {
                    this.user(user);
                    resolve(this._user);
                  })
                  .catch(reject);
              } else {
                reject("Could not find message");
              }
            })
            .catch(reject);
        }
      });
    }
    
    _resolveThread () {
      return new Promise((resolve, reject) => {
        if (this._thread) {
          resolve(this._thread);
        } else if (this._threadId) {
          this.models.findThread(this._threadId)
            .then((thread) => {
              if (thread) {
                this.thread(thread);
                resolve(thread);
              } else {
                reject(`Could not find thread ${this._threadId}`);
              }
            }) 
            .catch(reject);
        } else {
          this._resolveMessage()
            .then((message) => {
              if (message && message.threadId) {
                this.threadId(message.threadId);
                this._resolveThread()
                  .then(resolve)
                  .catch(reject);
              } else {
                reject(`Could not resolve message`);
              }
            })
            .catch(reject);
        }
      });
    }
    
    _resolveRole() {
      return new Promise((resolve, reject) => {
        if (this._role) {
          resolve(this._role);
        } else {
          this._resolveThread()
            .then((thread) => {
              this._resolveUser()
                .then((user) => {
                  this.role(this.userManagement.getThreadUserRole(config.get('keycloak:realm'), thread.id, user.id));
                  resolve(this._role);
                });
            })
            .catch(reject);
        }
      });
    }
    
    _resolveUserGroupIds() {
      return new Promise((resolve, reject) => {
        if (this._userGroupIds) {
          resolve(this._userGroupIds);
        } else {
          this._resolveUser()
            .then((user) => {
              this.userManagement.listUserGroupIds(config.get('keycloak:realm'), user.id)
                .then((userGroupIds) => {
                  this.userGroupIds(userGroupIds);
                  resolve(this._userGroupIds);
                })
                .catch(reject);
            })
            .catch(reject);
        }
      });
    }
    
    _resolveThreadUserIds () {
      return new Promise((resolve, reject) => {
        if (this._threadUserIds) {
          resolve(this._threadUserIds);
        } else {
          this._resolveThread()
            .then((thread) => {
              this.userManagement.getThreadUserIds(config.get('keycloak:realm'), thread.id)
                .then((threadUserIds) => {
                  this._threadUserIds = threadUserIds;
                  resolve(this._threadUserIds);
                });
            });
        }
      });
    }
    
    _resolveQuestionGroup () {
      return new Promise((resolve, reject) => {
        if (this._questionGroup) {
          resolve(this._questionGroup);
        } else if (this._threadId || this._thread) {
          this.models.findQuestionGroupByThreadId(this._threadId || this._thread.id)
            .then((questionGroup) => {
              this._questionGroup = questionGroup;
              resolve(questionGroup);
            })
            .catch(reject);
        } else {
          reject("Could not resolve question group");
        }
      });
    }
    
    _resolveMessage () {
      return new Promise((resolve, reject) => {
        if (this._message) {
          resolve(this._message);
        } else if (this._messageId) {
          this.models.findMessage(this._messageId)
            .then((message) => {
              if (message) {
                this.message(message);
                resolve(message);
              } else {
                reject(`Could not find message ${this._messageId}`);
              }
            })
            .catch(reject);
        } else {
          reject("Could not resolve message");
        }
      });
    }
  }
  
  class ClusterMessages {
    
    constructor (logger, models, userManagement, shadyMessages, pushNotifications) {
      this.logger = logger;
      this.models = models;
      this.userManagement = userManagement;
      this.shadyMessages = shadyMessages;
      this.pushNotifications = pushNotifications;
    }
    
    createMessageAddedBuilder() {
      return new MessageAddedBuilder(this.models, this.shadyMessages, this.userManagement);
    }
    
    onMessageAdded(event, data) {
      const userId = data['user-id'];
      const message = data['message'];
      const threadId = data['thread-id'];
      const threadType = data['thread-type'];
      
      const clients = this.webSockets.getClients();
      
      _.forEach(clients, (client) => {
        const sessionId = client.getSessionId();
        if (sessionId) {
          this.models.findSession(sessionId)
            .then((session) => {
              if (session.userId === userId) {
                client.sendMessage({
                  "type": "messages-added",
                  "data": {
                    'messages': [ message ],
                    'thread-id': threadId,
                    'thread-type': threadType
                  }
                });
              }
            })
            .catch((err) => {
              this.logger.error(`Failed to load session ${sessionId}`, err);
            });
        }
      });
    }
    
    onConversationThreadAdded(event, data) {
      const userId = data['user-id'];
      const thread = data['thread'];
      const clients = this.webSockets.getClients();
      
      _.forEach(clients, (client) => {
        const sessionId = client.getSessionId();
        if (sessionId) {
          this.models.findSession(sessionId)
            .then((session) => {
              if (session.userId === userId) {
                client.sendMessage({
                  "type": "conversation-threads-added",
                  "data": {
                    threads: [ thread ]
                  }
                });
              }
            })
            .catch((err) => {
              this.logger.error(`Failed to load session ${sessionId}`, err);
            });
        }
      });
    }
    
    onQuestionGroupAdded(event, data) {
      const userId = data['user-id'];
      const questionGroup = data['question-group'];
      const clients = this.webSockets.getClients();
      _.forEach(clients, (client) => {
        const sessionId = client.getSessionId();
        if (sessionId) {
          this.models.findSession(sessionId)
            .then((session) => {
              if (session.userId === userId) {
                this.getUserGroupIds(userId)
                  .then((userGroupIds) => {
                    this.userManagement.getQuestionGroupUserRole(config.get('keycloak:realm'), questionGroup.id, userId)
                      .then((role) => {
                        client.sendMessage({
                          "type": "question-groups-added",
                          "data": {
                            'question-groups': [ {
                              id: questionGroup.id,
                              title: questionGroup.title,
                              originId: questionGroup.originId,
                              latestMessage: questionGroup.latestMessage,
                              imageUrl: questionGroup.imageUrl,
                              role: role
                            }]
                          }
                        });                        
                      });
                  })
                  .catch((err) => {
                    this.logger.error(`Failed to list userGroupIds for ${userId} on ${err}`);
                  });
              }
            })
            .catch((err) => {
              this.logger.error(`Failed to load session ${sessionId}`, err);
            });
        }
      });
    }
    
    onQuestionGroupThreadAdded(event, data) {
      const userId = data['user-id'];
      const thread = data['thread'];
      const questionGroupId = data['question-group-id'];
      const clients = this.webSockets.getClients();
      
      _.forEach(clients, (client) => {
        const sessionId = client.getSessionId();
        if (sessionId) {
          this.models.findSession(sessionId)
            .then((session) => {
              if (session.userId === userId) {
                client.sendMessage({
                  "type": "question-group-threads-added",
                  "data": {
                    'question-group-id': questionGroupId,
                    'threads': [ thread ]
                  }
                });
              }
            })
            .catch((err) => {
              this.logger.error(`Failed to load session ${sessionId}`, err);
            });
        }
      });
    }
    
    onNewsArticleAdded(event, data) {
      const newsArticle = data['news-article'];
      const clients = this.webSockets.getClients();
      
      _.forEach(clients, (client) => {
        client.sendMessage({
          "type": "news-items-added",
          "data": {
            items: [ newsArticle ]
          }
        });
      });
    }
    
    getUserGroupIds(userId) {
      return this.userManagement.listUserGroupIds(config.get('keycloak:realm'), userId);
    }
    
    register(shadyMessages, webSockets) {
      this.webSockets = webSockets;
      shadyMessages.on("client:message-added", this.onMessageAdded.bind(this));
      shadyMessages.on("client:conversation-thread-added", this.onConversationThreadAdded.bind(this));
      shadyMessages.on("client:question-group-added", this.onQuestionGroupAdded.bind(this));
      shadyMessages.on("client:question-group-thread-added", this.onQuestionGroupThreadAdded.bind(this));
      shadyMessages.on("client:news-article-added", this.onNewsArticleAdded.bind(this));
    }
    
  };

  module.exports = (options, imports, register) => {
    const logger = imports['logger'];
    const models = imports['pakkasmarja-berries-models'];
    const userManagement = imports['pakkasmarja-berries-user-management'];
    const shadyMessages = imports['shady-messages'];
    const pushNotifications = imports['pakkasmarja-berries-push-notifications'];
   
    const clusterMessages = new ClusterMessages(logger, models, userManagement, shadyMessages, pushNotifications);
    register(null, {
      'pakkasmarja-berries-cluster-messages': clusterMessages
    });
  };

})();
