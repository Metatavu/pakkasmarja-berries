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
  
  class PakkasmarjaBerriesWordpress {
    
    constructor (logger) {
      this.logger = logger;
    }
    
    initialize(callback) {
      this.api = new WPAPI({ 
        endpoint: config.get('wordpress:api-url'),
        username: config.get('wordpress:username'),
        password: config.get('wordpress:password')
      });
      
      this.api.chatThreads = this.api.registerRoute( 'wp/v2', '/chat-thread/(?P<id>)' );
      this.api.questionGroups = this.api.registerRoute( 'wp/v2', '/question-group/(?P<id>)' );
      
      callback();
    }
    
    findPost(id) {
      return this.api.posts().id(id);
    }
    
    listNews(page, perPage) {
      return this.api.posts().perPage(perPage).page(page);
    }
    
    findChatThread(id) {
      return this.api.chatThreads().id(id);
    }
    
    findQuestionGroup(id) {
      return this.api.questionGroups().id(id);
    }
    
    resolveImageUrl(baseUrl, src) {
      const match = src ? /(.*\/wp-content)(.*)/.exec(src) : null;
      return match && match.length > 2 ? `${baseUrl}/images/wordpress${match[2]}` : src;   
    }
    
    processContents(baseUrl, contents) {
      const $ = cheerio.load(contents);
      $('img').each((index, img) => {
        $(img)
          .removeAttr('srcset')
          .attr('src', this.resolveImageUrl(baseUrl, $(img).attr('src')));
      });
      
      return $.html();
    }
  } 
  
  module.exports = (options, imports, register) => {
    const logger = imports.logger;
    const wordpress = new PakkasmarjaBerriesWordpress(logger);
    
    wordpress.initialize(() => {
      register(null, {
        'pakkasmarja-berries-wordpress': wordpress
      });
    });
  };
  
})();