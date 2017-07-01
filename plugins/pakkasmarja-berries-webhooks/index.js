/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';
  
  const util = require('util'); 
  const moment = require('moment');
  const config = require('nconf');
  const uuid = require('uuid4');
  const _ = require('lodash');
  
  class PakkasmarjaBerriesWebhooks {
    
    constructor (logger, models, wordpress, userManagement, shadyMessages, pushNotifications) {
      this.logger = logger;
      this.models = models;
      this.wordpress = wordpress;
      this.userManagement = userManagement;
      this.shadyMessages = shadyMessages;
      this.pushNotifications = pushNotifications;
    }
    
    handle(source, req) {
      switch (source) {
        case 'management':
          this.handleManagement(req);
        break;
        default:
          this.logger.warn(`Received a management from unknown source: ${source}`);
        break;
      }
    }
    
    handleManagement(req) {
      const hook = req.body['hook'];
      switch (hook) {
        case 'edit_post':
          this.handleManagementEditPost(req);
        break;
        default:
          this.logger.warn(`Received a management unknown webhook. ${hook}`);
        break;
      }
    }
    
    handleManagementEditPost(req) {
      const id = req.body['ID'];
      const postType = req.body['post_type'];
      
      if (!id) {
        this.logger.warn("Received a management edit post webhook without id");
        return;
      }
      
      switch (postType) {
        case 'post':
          this.handleManagementEditPostPost(id, req);
        break;
        case 'chat-thread':
          this.handleManagementEditPostChatThread(id, req);
        break;
        case 'question-group':
          this.handleManagementEditPostQuestionGroup(id, req);
        break;
      }
    }
    
    handleManagementEditPostPost(id, req) {
      const postStatus = req.body['post_status'];
      if (postStatus === 'publish') {
        this.wordpress.findPost(id)
          .then((wpPost) => {
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
                      this.logger.error(`Failed to create news article from ${wpId}`, err);
                    });
                }
              })
              .catch((err) => {
                this.logger.error(`Failed to find news article ${wpId}`, err);
              });
          })
          .catch((err) => {
            console.error(err);
            this.logger.error(`Failed to fetch post ${id}`, err);
          });
      }
    }        
    
    handleManagementEditPostChatThread(id, req) {
      const postStatus = req.body['post_status'];
      if (postStatus === 'publish') {
        this.wordpress.findChatThread(id)
          .then((wpChatThread) => {
            const wpId = wpChatThread.id.toString();
            const wpUserGroupSetings = wpChatThread['user-group-setings'];
            const wpFeaturedMediaUrl = wpChatThread['better_featured_image'] ? wpChatThread['better_featured_image'].source_url : null;
            const wpTitle = wpChatThread.title.rendered;
            const wpType = 'conversation';
            const userGroupRoles = {};
            const imageUrl = this.wordpress.resolveImageUrl(this.getBaseUrl(), wpFeaturedMediaUrl);
            
            _.forEach(wpUserGroupSetings, (wpUserGroupSeting) => {
              userGroupRoles[wpUserGroupSeting.id] = wpUserGroupSeting.role;
            });
                   
            this.models.findThreadByOriginId(wpId)
              .then((thread) => {
                if (thread) {
                  this.models.updateThread(thread.id, wpTitle, imageUrl)
                    .then(() => {
                      this.models.setThreadUserGroupRoles(thread.id, userGroupRoles)
                        .then(() => {
                          this.logger.info(`Thread ${thread.id} updated`);
                          this.notifyClusterConversationThreadAdded(thread);
                        });
                    }) 
                    .catch((err) => {
                      this.logger.error(`Failed to update chat thread ${wpId}`, err);
                    });
                } else {
                  this.models.createThread(wpId, wpTitle, wpType, imageUrl)
                    .then((thread) => {
                      this.models.setThreadUserGroupRoles(thread.id, userGroupRoles)
                        .then(() => {
                          this.logger.info(`Thread ${thread.id} created`);
                          this.notifyClusterConversationThreadIdAdded(thread.id);
                        });
                    }) 
                    .catch((err) => {
                      this.logger.error(`Failed to create chat thread from ${wpId}`, err);
                    });
                }
              })
              .catch((err) => {
                this.logger.error(`Failed to find chat thread ${wpId}`, err);
              });
          })
          .catch((err) => {
            this.logger.error(`Failed to fetch chat thread ${id}`, err);
          });
      }
    }
    
    handleManagementEditPostQuestionGroup(id, req) {
      const postStatus = req.body['post_status'];
      if (postStatus === 'publish') {
        this.wordpress.findQuestionGroup(id)
          .then((wpQuestionGroup) => {
            const wpId = wpQuestionGroup.id.toString();
            const wpUserGroupSetings = wpQuestionGroup['user-group-setings'];
            const wpFeaturedMediaUrl = wpQuestionGroup['better_featured_image'] ? wpQuestionGroup['better_featured_image'].source_url : null;
            const wpTitle = wpQuestionGroup.title.rendered;
            const userGroupRoles = {};
            const imageUrl = this.wordpress.resolveImageUrl(this.getBaseUrl(), wpFeaturedMediaUrl);
            
            _.forEach(wpUserGroupSetings, (wpUserGroupSeting) => {
              userGroupRoles[wpUserGroupSeting.id] = wpUserGroupSeting.role;
            });
                   
            this.models.findQuestionGroupByOriginId(wpId)
              .then((questionGroup) => {
                if (questionGroup) {
                  this.models.updateQuestionGroup(questionGroup.id, wpTitle, imageUrl)
                    .then(() => {
                      this.models.setQuestionGroupUserGroupRoles(questionGroup.id, userGroupRoles)
                        .then(() => {
                          this.logger.info(`Group ${questionGroup.id} updated`);
                          this.notifyClusterQuestionGroupAdded(questionGroup);
                        });
                    }) 
                    .catch((err) => {
                      this.logger.error(`Failed to update question group ${wpId}`, err);
                    });
                } else {
                  this.models.createQuestionGroup(wpId, wpTitle, imageUrl)
                    .then((questionGroup) => {
                      this.models.setQuestionGroupUserGroupRoles(questionGroup.id, userGroupRoles)
                        .then(() => {
                          this.logger.info(`Group ${questionGroup.id} created`);
                          this.notifyClusterQuestionGroupIdAdded(questionGroup.id);
                        });
                    }) 
                    .catch((err) => {
                      this.logger.error(`Failed to create question group from ${wpId}`, err);
                    });
                }
              })
              .catch((err) => {
                this.logger.error(`Failed to find question group ${wpId}`, err);
              });
          })
          .catch((err) => {
            this.logger.error(`Failed to fetch question group ${id}`, err);
          });
      }
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
    
    notifyClusterConversationThreadIdAdded(threadId) {
      this.models.findThread(threadId)
        .then((thread) => {
          this.notifyClusterConversationThreadAdded(thread);
        })
        .catch((err) => {
          this.logger.error(err);
        });
    }
    
    notifyClusterConversationThreadAdded(thread) {
      this.userManagement.getThreadUserIds(config.get('keycloak:realm'), thread.id)
        .then((userIds) => {
          userIds.forEach((userId) => {
            this.shadyMessages.trigger("client:conversation-thread-added", {
              "user-id": userId,
              "thread": thread
            });                          
          });
        })
        .catch((err) => {
          this.logger.error(err);
        });
    }
    
    notifyClusterQuestionGroupIdAdded(questionGroupId) {
      this.models.findQuestionGroup(questionGroupId)
        .then((questionGroup) => {
          this.notifyClusterQuestionGroupAdded(questionGroup);
        })
        .catch((err) => {
          this.logger.error(err);
        });
    }
    
    notifyClusterQuestionGroupAdded(questionGroup) {
      this.userManagement.getQuestionGroupUserIds()
        .then((userIds) => {
          userIds.forEach((userId) => {
            this.shadyMessages.trigger("client:question-group-added", {
              "user-id": userId,
              "question-group": questionGroup
            });                          
          });
        })
        .catch((err) => {
          this.logger.error(err);
        });
    }
    
    getBaseUrl() {
      const host = config.get('client:server:host');
      const secure = config.get('client:server:secure');
      const port = config.get('client:server:port');
      const protocol = secure ? 'https' : 'http';
      return `${protocol}://${host}:${port}`;
    }
    
  }

  module.exports = (options, imports, register) => {
    const logger = imports['logger'];
    const models = imports['pakkasmarja-berries-models'];
    const wordpress = imports['pakkasmarja-berries-wordpress'];
    const shadyMessages = imports['shady-messages'];
    const userManagement = imports['pakkasmarja-berries-user-management'];
    const pushNotifications = imports['pakkasmarja-berries-push-notifications'];
    
    const webhooks = new PakkasmarjaBerriesWebhooks(logger, models, wordpress, userManagement, shadyMessages, pushNotifications);
    register(null, {
      'pakkasmarja-berries-webhooks': webhooks
    });
  };

})();
