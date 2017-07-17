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
    
    start() {
      this.syncManagementNewsArticlesInterval = setInterval(() => {
        this.syncManagementNewsArticles();
      }, 1000 * 60 * 2);
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