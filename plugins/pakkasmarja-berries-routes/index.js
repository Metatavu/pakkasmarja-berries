/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';
  
  const moment = require('moment');
  const uuid = require('uuid4');
  const config = require('nconf');
  
  class Routes {
    
    constructor (logger, pakkasmarjaBerriesModels) {
      this.logger = logger;
      this.pakkasmarjaBerriesModels = pakkasmarjaBerriesModels;
    }
    
    getIndex(req, res) {
      res.render('index', Object.assign({ 

      }, req.pakkasmarjaBerries));
    }
    
    getKeycloak(req, res) {
      res.header('Content-Type', 'application/json');
      res.send(config.get('keycloak'));
    }
    
    register(app, keycloak) {
      // Navigation     
      
      app.get("/", this.getIndex.bind(this));
      
      // Keycloak
      
      app.get('/keycloak.json', this.getKeycloak.bind(this)); 
    }
    
  };

  module.exports = (options, imports, register) => {
    const logger = imports['logger'];
    const pakkasmarjaBerriesModels = imports['pakkasmarja-berries-models'];
    const routes = new Routes(logger, pakkasmarjaBerriesModels);
    register(null, {
      'pakkasmarja-berries-routes': routes
    });
  };

})();
