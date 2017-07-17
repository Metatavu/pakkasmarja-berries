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
                        const originId = post.id.toString();
                        const title = post.title.rendered;
                        const content = post.content.rendered;

                        const host = config.get('client:server:host');
                        const secure = config.get('client:server:secure');
                        const port = config.get('client:server:port');
                        const protocol = secure ? 'https' : 'http';
                        const baseUrl = `${protocol}://${host}:${port}`;

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
    
    start() {
      this.removeNewsArticleInterval = setInterval(() => {
        this.removeNewsArticleIfDoesntExistInWordpress();
      }, 120000);
      
      this.createOrUpdateNewsArticleInterval = setInterval(() => {
        this.createOrUpdateNewsArticle();
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