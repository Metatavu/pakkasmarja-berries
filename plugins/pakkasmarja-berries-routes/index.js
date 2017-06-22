/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';
  
  const _ = require('lodash');
  const moment = require('moment');
  const uuid = require('uuid4');
  const config = require('nconf');
  const request = require('request');
  
  class Routes {
    
    constructor (logger, models, userManagement, webhooks) {
      this.logger = logger;
      this.models = models;
      this.userManagement = userManagement;
      this.webhooks = webhooks;
    }
    
    getIndex(req, res) {
      res.render('index', Object.assign({ 

      }, req.pakkasmarjaBerries));
    }
    
    getImagesWordpress(req, res) {
      const contentUrl = config.get('wordpress:content-url');
      const forwardHeaderNames = ['if-none-match', 'cache-control'];
      const requestHeaders = {};
      const path = req.path.startsWith('/images/wordpress/') ? req.path.substring(18) : req.path;
      
      if (req.headers) {
        _.each(req.headers, (value, key) => {
          if (forwardHeaderNames.indexOf(key.toLowerCase()) > -1) {
            requestHeaders[key] = value;
          }
        });
      }
        
      request({
          url: `${contentUrl}/${path}`,
          headers: requestHeaders
      }).pipe(res);
    }
    
    getKeycloak(req, res) {
      res.header('Content-Type', 'application/json');
      res.send(config.get('keycloak'));
    }
    
    postJoin(req, res) {
      const keycloakServerUrl = config.get('keycloak:auth-server-url');
      const keycloakRealm = config.get('keycloak:realm');
      const keycloakUrl = `${keycloakServerUrl}/realms/${keycloakRealm}/protocol/openid-connect/userinfo`;
      
      request.get(keycloakUrl, {
        'auth': {
          'bearer': req.body.token
        }
      }, (authErr, response, body) => {
        if (authErr) {
          // TODO: Better error handling
          this.logger.error(authErr);
          res.status(403).send(authErr);
        } else {
          const reponse = JSON.parse(body);
          const userId = reponse.sub;
          const sessionId = this.models.getUuid();
          
          this.models.createSession(sessionId, userId)
            .then((session) => {
              res.send({
                sessionId: sessionId
              });
            })
            .catch((sessionErr) => {
              logger.error(sessionErr);
              res.status(500).send(sessionErr);
            });
        }
      });
    }
    
    getRestV1UserGroups(req, res) {
      this.userManagement.listGroups(config.get('keycloak:realm'))
        .then((userGroups) => {
           res.send(userGroups);
        })
        .catch((err) => {
          this.logger.error(err);
          res.status(500).send(err);
        });
    }
    
    postWebhooksManagement(req, res) {
      this.webhooks.handle('management', req);
      res.send("ok");
    }
    
    register(app, keycloak) {
      // Navigation     
      
      app.get("/", this.getIndex.bind(this));
      app.get("/images/wordpress/*", this.getImagesWordpress.bind(this));
      
      // Keycloak
      
      app.get('/keycloak.json', this.getKeycloak.bind(this));
      app.post('/join', this.postJoin.bind(this));
      
      // REST
      
      // TODO: Add security!!!
      
      app.get('/rest/v1/usergroups', this.getRestV1UserGroups.bind(this));
      
      
      // Webhooks
      
      app.post('/webhooks/management', this.postWebhooksManagement.bind(this));
    }
    
  };

  module.exports = (options, imports, register) => {
    const logger = imports['logger'];
    const models = imports['pakkasmarja-berries-models'];
    const userManagement = imports['pakkasmarja-berries-user-management'];
    const webhooks = imports['pakkasmarja-berries-webhooks'];
    
    const routes = new Routes(logger, models, userManagement, webhooks);
    register(null, {
      'pakkasmarja-berries-routes': routes
    });
  };

})();
