/*jshint esversion: 6 */
/* global __dirname */

(() => {
  "use strict";
  
  class PakkasmarjaBerriesWebhooks {
    
    constructor (logger, models, wordpress, pakkasmarjaBerriesUtils) {
      this.logger = logger;
      this.models = models;
      this.wordpress = wordpress;
      this.pakkasmarjaBerriesUtils = pakkasmarjaBerriesUtils;
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
            this.pakkasmarjaBerriesUtils.updateOrCreateManagementPost(wpPost);
          })
          .catch((err) => {
            this.logger.error(`Failed to fetch post ${id}`, err);
          });
      } else if (postStatus === 'trash') {
        this.models.findNewsArticleByOriginId(id)
          .then((newsArticle) => {
            this.models.removeNewsArticle(newsArticle.id)
              .then(() => {
                this.logger.info(`News article ${newsArticle.id} removed`);
              })
              .catch((err) => {
                this.logger.error(`Failed to remove news article ${newsArticle.id}`, err);
              });
          })
          .catch((err) => {
            this.logger.error(`Failed to fetch news article ${id}`, err);
          });
      }
    }        
    
    handleManagementEditPostChatThread(id, req) {
      const postStatus = req.body['post_status'];
      if (postStatus === 'publish') {
        this.wordpress.findChatThread(id)
          .then((wpChatThread) => {
            this.pakkasmarjaBerriesUtils.updateOrCreateChatThread(wpChatThread);
          })
          .catch((err) => {
            this.logger.error(`Failed to fetch chat thread ${id}`, err);
          });
      } else if (postStatus === 'trash') {
        this.models.findThreadByOriginId(id)
          .then((thread) => {
            this.models.archiveThread(thread.id)
              .then(() => {
                this.logger.info(`Thread ${thread.id} removed`);
              })
              .catch((err) => {
                this.logger.error(`Failed to remove chat thread ${thread.id}`, err);
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
            this.pakkasmarjaBerriesUtils.updateOrCreateQuestionGroup(wpQuestionGroup);
          })
          .catch((err) => {
            this.logger.error(`Failed to fetch question group ${id}`, err);
          });
      } else if (postStatus === 'trash') {
        this.models.findQuestionGroupByOriginId(id)
          .then((questionGroup) => {
            this.models.archiveQuestionGroup(questionGroup.id)
              .then(() => {
                this.logger.info(`Question group ${questionGroup.id} removed`);
              })
              .catch((err) => {
                this.logger.error(`Failed to remove question group ${questionGroup.id}`, err);
              });
          })
          .catch((err) => {
            this.logger.error(`Failed to fetch question group ${id}`, err);
          });
      }
    }
    
  }

  module.exports = (options, imports, register) => {
    const logger = imports['logger'];
    const models = imports['pakkasmarja-berries-models'];
    const wordpress = imports['pakkasmarja-berries-wordpress'];
    const pakkasmarjaBerriesUtils = imports['pakkasmarja-berries-utils'];
    
    const webhooks = new PakkasmarjaBerriesWebhooks(logger, models, wordpress, pakkasmarjaBerriesUtils);
    register(null, {
      'pakkasmarja-berries-webhooks': webhooks
    });
  };

})();
