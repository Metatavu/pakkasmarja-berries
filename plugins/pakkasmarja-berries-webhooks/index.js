/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';
  
  const util = require('util'); 
  const moment = require('moment');
  const uuid = require('uuid4');
  const _ = require('lodash');
  
  class PakkasmarjaBerriesWebhooks {
    
    constructor (logger, models, wordpress) {
      this.logger = logger;
      this.models = models;
      this.wordpress = wordpress;
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
        case 'chat-thread':
          this.handleManagementEditPostChatThread(id, req);
        break;
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
            const imagePathMatch = wpFeaturedMediaUrl ? /(.*\/wp-content)(.*)/.exec(wpFeaturedMediaUrl) : null;
            const imagePath = imagePathMatch && imagePathMatch.length > 2 ? '/images/wordpress' + imagePathMatch[2] : null;
            
            _.forEach(wpUserGroupSetings, (wpUserGroupSeting) => {
              userGroupRoles[wpUserGroupSeting.id] = wpUserGroupSeting.role;
            });
                   
            this.models.findThreadByOriginId(wpId)
              .then((thread) => {
                if (thread) {
                  this.models.updateThread(thread, wpTitle, imagePath, userGroupRoles)
                    .then(() => {
                      this.logger.info(`Thread ${wpId} updated`);
                    }) 
                    .catch((err) => {
                      this.logger.error(`Failed to update chat thread ${wpId}`, err);
                    });
                } else {
                  const threadId = this.models.getUuid();
                  this.models.createThread(threadId, wpId, wpTitle, wpType, wpFeaturedMediaUrl, userGroupRoles)
                    .then(() => {
                      this.logger.info(`Thread ${wpId} created`);
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
    
  }

  module.exports = (options, imports, register) => {
    const logger = imports['logger'];
    const models = imports['pakkasmarja-berries-models'];
    const wordpress = imports['pakkasmarja-berries-wordpress'];
   
    const webhooks = new PakkasmarjaBerriesWebhooks(logger, models, wordpress);
    register(null, {
      'pakkasmarja-berries-webhooks': webhooks
    });
  };

})();
