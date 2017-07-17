/* jshint esversion: 6 */
/* global __dirname, Promise */
(() => {
  'use strict';
  
  const _ = require('lodash');
  const async = require('async');
  const util = require('util');
  const Promise = require('bluebird');
  const config = require('nconf');
  const WPAPI = require('wpapi');
  const cheerio = require('cheerio');
  
  class PakkasmarjaBerriesScheluders {
    
    constructor (logger, wordpress, models) {
      this.logger = logger;
      this.wordpress = wordpress;
      this.models = models;
    }
    
    createOrUpdateNewsArticle() {
        this.models.findAllNewsArticles()
          .then((articles) => {
            this.wordpress.listPosts(1, 99)
              .then((posts) => {
                  posts.forEach((post) => {
                    this.models.findNewsArticleByOriginId(post.id)
                      .then((articleFromDatabase) => {
                        const baseUrl = this.getBaseUrl();
                        const originId = post.id.toString();
                        const title = post.title.rendered;
                        const content = post.content.rendered;
                        const contents = this.wordpress.processContents(baseUrl, content);
                        const imgUrl = post.better_featured_image ? this.wordpress.resolveImageUrl(baseUrl, post.better_featured_image.source_url) : null;

                        if (articleFromDatabase) {
                          this.models.updateNewsArticle(articleFromDatabase.id, title, contents, imgUrl);
                        } else {
                          this.models.createNewsArticle(originId, title, contents, imgUrl);
                        }
                      });
                  });
              });
          });
    }
    
    removeNewsArticleIfDoesntExistInWordpress() {
        let postsArray = [];
        let counter = 0;
        this.models.findAllNewsArticles()
          .then((articles) => {
            this.wordpress.listPosts(1, 99)
            .then((posts) => {
              for (let i = 0; i < posts.length; i++) {
                counter++;
                postsArray.push(posts[i].id.toString());

                if (counter === posts.length) {
                  for (let i = 0; i < articles.length; i++) {
                    if (postsArray.indexOf(articles[i].originId.toString()) === -1) {
                      this.models.removeNewsArticle(articles[i].id);
                    }
                  }
                }
              }
            });
          });
    }
    
    createOrUpdateChatThread() {
      this.models.findAllChatThreads()
        .then((threadsInDatabase) => {
          this.wordpress.listChatThreads()
            .then((threadsInWordpress) => {
              threadsInWordpress.forEach((thread) => {
                this.models.findThreadByOriginId(thread.id)
                .then((threadFromDatabase) => {
                  const baseUrl = this.getBaseUrl();
                  const wpId = thread.id;
                  const wpTitle = thread.title.rendered;
                  const wpType = 'conversation';
                  const imageUrl = thread.better_featured_image ? this.wordpress.resolveImageUrl(baseUrl, thread.better_featured_image.source_url) : null;
                  const wpUserGroupSetings = thread['user-group-setings'] ? thread['user-group-setings'] : null;
                  const userGroupRoles = {};
                  
                  wpUserGroupSetings.forEach((wpUserGroupSeting) => {
                    userGroupRoles[wpUserGroupSeting.id] = wpUserGroupSeting.role;
                  });
                  
                  if (threadFromDatabase) {
                    const threadId = threadFromDatabase.id;
                    
                    this.models.updateThread(threadId, wpTitle, imageUrl)
                      .then(() => {
                        this.models.setThreadUserGroupRoles(threadId, userGroupRoles);
                      });
                  } else {
                    this.models.createThread(wpId, wpTitle, wpType, imageUrl)
                      .then((newThread) => {
                        this.models.setThreadUserGroupRoles(newThread.id, userGroupRoles);
                      });
                  }
                });
              });
            });
        });
    }
    
    removeChatThread() {
      let threadsArray = [];
      let counter = 0;
      this.models.findAllChatThreads()
        .then((threads) => {
          this.wordpress.listChatThreads()
          .then((chatThreads) => {
            for (let i = 0; i < chatThreads.length; i++) {
              counter++;
              threadsArray.push(chatThreads[i].id.toString());

              if (counter === chatThreads.length) {
                for (let i = 0; i < threads.length; i++) {
                  if (threadsArray.indexOf(threads[i].originId.toString()) === -1) {
                    this.models.removeMessageAttachments(threads[i].id)
                      .then(() => {
                        this.models.removeThreadMessages(threads[i].id)
                          .then(() => {
                            this.models.removeThreadUserGroupRole(threads[i].id)
                              .then(() => {
                                this.models.removeThread(threads[i].id);
                              });
                          });
                      });
                  }
                }
              }
            }
          });
        });
    }
    
    createOrUpdateQuestionGroup() {
      this.models.findAllQuestionGroups()
        .then((questionGroupsInDatabase) => {
          this.wordpress.listQuestionGroups()
            .then((questionGroupsInWordpress) => {
              questionGroupsInWordpress.forEach((questionGroup) => {
                this.models.findQuestionGroupByOriginId(questionGroup.id)
                .then((questionGroupFromDatabase) => {
                  const baseUrl = this.getBaseUrl();
                  const wpId = questionGroup.id;
                  const wpTitle = questionGroup.title.rendered;
                  const wpType = 'conversation';
                  const imageUrl = questionGroup.better_featured_image ? this.wordpress.resolveImageUrl(baseUrl, questionGroup.better_featured_image.source_url) : null;
                  const wpUserGroupSetings = questionGroup['user-group-setings'] ? questionGroup['user-group-setings'] : null;
                  const userGroupRoles = {};
                  
                  wpUserGroupSetings.forEach((wpUserGroupSeting) => {
                    userGroupRoles[wpUserGroupSeting.id] = wpUserGroupSeting.role;
                  });
                  
                  if (questionGroupFromDatabase) {
                    this.models.updateQuestionGroup(questionGroup.id, wpTitle, imageUrl)
                      .then(() => {
                        this.models.setQuestionGroupUserGroupRoles(questionGroupFromDatabase.id, userGroupRoles);
                      });
                  } else {
                    this.models.createQuestionGroup(wpId, wpTitle, imageUrl)
                      .then((questionGroup) => {
                        this.models.setQuestionGroupUserGroupRoles(questionGroup.id, userGroupRoles);
                      });
                  }
                });
              });
            });
        });
    }
    
    removeQuestionGroup() {
      let questionGroupArray = [];
      let counter = 0;
      this.models.findAllQuestionGroups()
        .then((questionGroupsInDatabase) => {
          this.wordpress.listQuestionGroups()
          .then((questionGroupsInWordpress) => {
            for (let i = 0; i < questionGroupsInWordpress.length; i++) {
              counter++;
              questionGroupArray.push(questionGroupsInWordpress[i].id.toString());

              if (counter === questionGroupsInWordpress.length) {
                for (let i = 0; i < questionGroupsInDatabase.length; i++) {
                  if (questionGroupArray.indexOf(questionGroupsInDatabase[i].originId.toString()) === -1) {
                    this.models.removeQuestionGroupUserGroupRoles(questionGroupsInDatabase[i].id)
                      .then(() => {
                        this.models.removeQuestionGroup(questionGroupsInDatabase[i].id);
                      });                    
                  }
                }
              }
            }
          });
        });
    }
    
    getBaseUrl() {
      const host = config.get('client:server:host');
      const secure = config.get('client:server:secure');
      const port = config.get('client:server:port');
      const protocol = secure ? 'https' : 'http';
      const baseUrl = `${protocol}://${host}:${port}`;
      
      return baseUrl;
    }
    
    start() {
      this.interval = setInterval(() => {
        this.createOrUpdateChatThread();
        this.removeChatThread();
        this.createOrUpdateQuestionGroup();
        this.removeQuestionGroup();
        this.createOrUpdateNewsArticle();
        this.removeNewsArticleIfDoesntExistInWordpress();
      }, 120000);
    }
    
  } 
  
  module.exports = (options, imports, register) => {
    const logger = imports.logger;
    const models = imports['pakkasmarja-berries-models'];
    const wordpress = imports['pakkasmarja-berries-wordpress'];
    const scheluder = new PakkasmarjaBerriesScheluders(logger, wordpress, models);
    
    register(null, {
      'pakkasmarja-berries-scheluders': scheluder
    });
  };
  
})();