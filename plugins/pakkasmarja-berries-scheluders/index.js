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
  const moment = require('moment');
  
  class PakkasmarjaBerriesScheluders {
    
    constructor (logger, wordpress, models, shadyMessages, pushNotifications) {
      this.logger = logger;
      this.wordpress = wordpress;
      this.models = models;
      this.shadyMessages = shadyMessages;
      this.pushNotifications = pushNotifications;
    }
    
    getBaseUrl() {
      const host = config.get('client:server:host');
      const secure = config.get('client:server:secure');
      const port = config.get('client:server:port');
      const protocol = secure ? 'https' : 'http';
      return `${protocol}://${host}:${port}`;
    }
    
    notifyClusterNewsArticleAdded(newsArticle) {
      this.shadyMessages.trigger("client:news-article-added", {
        "news-article": {
          "id": newsArticle.id,
          "contents": newsArticle.contents,
          "title": newsArticle.title,
          "created": moment(newsArticle.createdAt).format(),
          "modified": moment(newsArticle.modifiedAt || newsArticle.createdAt).format(),
          "image": newsArticle.imageUrl,
          "read": false
        }
      });
    }
    
    syncManagementNewsArticles() {
      this.models.findAllNewsArticles()
        .then((articles) => {
          this.wordpress.listPosts(1, 99)
          .then((posts) => {
            const existingManagementIds = posts.map((post) => {
              return post.id.toString()
            });
            
            const articlesToRemove = _.filter(articles, (article) => {
              return existingManagementIds.indexOf(article.originId) < 0;
            });
            
            for (let i = 0; i < articlesToRemove.length; i++) {
              this.models.removeNewsArticle(articlesToRemove[i].id);
            }
            
            posts.forEach((wpPost) => {
              const baseUrl = this.getBaseUrl();
              const wpId = wpPost.id.toString();
              const wpTitle = wpPost.title.rendered;
              const wpContents = wpPost.content.rendered;
              const contents = this.wordpress.processContents(baseUrl, wpContents);
              const created = moment(wpPost.date_gmt).valueOf();
              const modified = moment(wpPost.modified_gmt).valueOf();
              const imageUrl = wpPost.better_featured_image ? this.wordpress.resolveImageUrl(baseUrl, wpPost.better_featured_image.source_url) : null;

              this.models.findNewsArticleByOriginId(wpId)
                .then((newsArticle) => {
                  if (newsArticle) {
                    this.models.updateNewsArticle(newsArticle.id, wpTitle, contents, imageUrl)
                      .then(() => {
                        this.logger.info(`News article ${newsArticle.id} updated`);
                      }) 
                      .catch((err) => {
                        this.logger.error(`Failed to update news article ${wpId}`, err);
                      });
                  } else {
                    this.models.createNewsArticle(wpId, wpTitle, contents, imageUrl)
                      .then((newsArticle) => {
                        this.logger.info(`News article ${newsArticle.id} created`);
                        this.notifyClusterNewsArticleAdded(newsArticle);
                        this.pushNotifications.notifyNewsItemPublish(wpTitle);
                      }) 
                      .catch((err) => {
                        console.log(err);
                        this.logger.error(`Failed to create news article from ${wpId}`, err);
                      });
                  }
                })
                .catch((err) => {
                  this.logger.error(`Failed to find news article ${wpId}`, err);
                });
            });
            
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
    
    start() {
      this.interval = setInterval(() => {
        this.syncManagementNewsArticles();
        this.createOrUpdateChatThread();
        this.removeChatThread();
        this.createOrUpdateQuestionGroup();
        this.removeQuestionGroup();
      }, 60 * 1000 * 2);
    }
    
  } 
  
  module.exports = (options, imports, register) => {
    const logger = imports.logger;
    const models = imports['pakkasmarja-berries-models'];
    const wordpress = imports['pakkasmarja-berries-wordpress'];
    const shadyMessages = imports['shady-messages'];
    const pushNotifications = imports['pakkasmarja-berries-push-notifications'];
    const scheluder = new PakkasmarjaBerriesScheluders(logger, wordpress, models, shadyMessages, pushNotifications);
    
    register(null, {
      'pakkasmarja-berries-scheluders': scheluder
    });
  };
  
})();