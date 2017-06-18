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
      
      callback();
    }
    
    listNews(page, perPage) {
      return this.api.posts().perPage(perPage).page(page);
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