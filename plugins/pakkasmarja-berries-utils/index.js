/*jshint esversion: 6 */
/* global __dirname */

(() => {
  "use strict";
  
  const util = require('util'); 
  const moment = require('moment');
  const config = require('nconf');
  const uuid = require('uuid4');
  const _ = require('lodash');
  
  class PakkasmarjaBerriesUtils {
    
    constructor (logger, models, wordpress, userManagement, shadyMessages, pushNotifications) {
      this.logger = logger;
      this.models = models;
      this.wordpress = wordpress;
      this.userManagement = userManagement;
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
    
    updateOrCreateManagementPost(wpPost, silentUpdate) {
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
            this.models.updateNewsArticle(newsArticle.id, wpTitle, contents, imageUrl, silentUpdate)
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
                this.userManagement.listUsers()
                  .then((users) => {
                    const userIds = _.uniq(users.map((user) => {
                      return user.id;
                    }));
                    this.buildPushNotification(userIds, 'Uusi ajankohtainen julkaistu.', wpTitle, 'news-push-notification');
                  })
                  .catch((err) => {
                    this.logger.error('Failed to list users to create push notification', err);
                  });
              }) 
              .catch((err) => {
                this.logger.error(`Failed to create news article from ${wpId}`, err);
              });
          }
        })
        .catch((err) => {
          this.logger.error(`Failed to find news article ${wpId}`, err);
        });
    }
    
    buildPushNotification(userIds, title, body, notificationSetting) { 
      userIds.forEach((userId) => {
        this.models.findUserSettingsByUserIdAndKey(userId, notificationSetting)
          .then((userSetting) => {
            if (!userSetting) {
              this.pushNotifications.sendPushNotification(userId, title, body, true);
            } else {
              if (userSetting.settingValue !== 'disabled') {
                this.pushNotifications.sendPushNotification(userId, title, body, userSetting.settingValue !== 'silent');
              }
            }
          });
      });
    }
    
    async updateOrCreateChatThread(wpChatThread, silentUpdate) {
      const wpId = wpChatThread.id.toString();
      const wpUserGroupSetings = wpChatThread['user-group-setings'];
      const wpPredefinedTexts = wpChatThread['predefined-texts'] || [];
      const wpFeaturedMediaUrl = wpChatThread['better_featured_image'] ? wpChatThread['better_featured_image'].source_url : null;
      const wpTitle = wpChatThread.title.rendered;
      const wpType = 'conversation';
      const userGroupRoles = {};
      const imageUrl = this.wordpress.resolveImageUrl(this.getBaseUrl(), wpFeaturedMediaUrl);
      const answerType = "TEXT";

      _.forEach(wpUserGroupSetings, (wpUserGroupSeting) => {
        userGroupRoles[wpUserGroupSeting.id] = wpUserGroupSeting.role;
      });

      try {
        let thread = await this.models.findThreadByOriginId(wpId); 

        if (thread) {
          await this.models.updateThread(thread.id, wpTitle, imageUrl, silentUpdate, answerType); 
          await this.models.setThreadUserGroupRoles(thread.id, userGroupRoles);
          this.logger.info(`Thread ${thread.id} updated`);
          this.notifyClusterConversationThreadAdded(thread);
        } else {
          thread = await this.models.createThread(wpId, wpTitle, wpType, imageUrl, answerType);
          await this.models.setThreadUserGroupRoles(thread.id, userGroupRoles);
          this.logger.info(`Thread ${thread.id} created`);
          this.notifyClusterConversationThreadIdAdded(thread.id);
        }

        const predefinedTexts = await this.models.listThreadPredefinedTextsByThreadId(thread.id);
        const existingTexts = predefinedTexts.map((predefinedText) => {
          return predefinedText.text;
        });

        for (let i = 0; i < wpPredefinedTexts.length; i++) {
          const wpPredefinedText = wpPredefinedTexts[i];
          const existingIndex = existingTexts.indexOf(wpPredefinedText);

          if (existingIndex > -1) {
            existingTexts.splice(existingIndex, 1);
          } else {
            await this.models.createThreadPredefinedText(thread.id, wpPredefinedText);
          }
        }

        for (let i = 0; i < existingTexts.length; i++) {
          const existingText = existingTexts[i];
          await this.models.deleteThreadPredefinedTextByThreadIdAndText(thread.id, existingText);
        }

      } catch (err) {
        this.logger.error(`Failed to find chat thread ${wpId}`, err);
      }
    }
    
    updateOrCreateQuestionGroup(wpQuestionGroup, silentUpdate) {
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
            this.models.updateQuestionGroup(questionGroup.id, wpTitle, imageUrl, silentUpdate)
              .then(() => {
                this.models.setQuestionGroupUserGroupRoles(questionGroup.id, userGroupRoles)
                  .then(() => {
                    this.logger.info(`Group ${questionGroup.id} updated`);
                    this.notifyClusterQuestionGroupAdded(questionGroup);
                  })
                  .catch((err) => {
                    this.logger.error(`Failed to update question group roles for ${wpId}`, err);
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
                    this.notifyClusterQuestionGroupAdded(questionGroup);
                  })
                  .catch((err) => {
                    this.logger.error(`Failed to update question group roles for ${wpId}`, err);
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
      this.userManagement.getThreadUserIds(config.get("keycloak:admin:realm"), thread.id)
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
    
    notifyClusterQuestionGroupAdded(questionGroup) {
      this.userManagement.getQuestionGroupUserIds(config.get("keycloak:admin:realm"), questionGroup.id)
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
    
  }

  module.exports = (options, imports, register) => {
    const logger = imports.logger;
    const models = imports['pakkasmarja-berries-models'];
    const wordpress = imports['pakkasmarja-berries-wordpress'];
    const shadyMessages = imports['shady-messages'];
    const userManagement = imports['pakkasmarja-berries-user-management'];
    const pushNotifications = imports['pakkasmarja-berries-push-notifications'];
    
    const pakkasmarjaBerriesUtils = new PakkasmarjaBerriesUtils(logger, models, wordpress, userManagement, shadyMessages, pushNotifications);
    register(null, {
      'pakkasmarja-berries-utils': pakkasmarjaBerriesUtils
    });
  };

})();
