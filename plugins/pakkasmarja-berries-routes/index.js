/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';
  
  const moment = require('moment');
  const uuid = require('uuid4');
  const config = require('nconf');
  const request = require('request');
  
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
    
    register(app, keycloak) {
      // Navigation     
      
      app.get("/", this.getIndex.bind(this));
      
      // Keycloak
      
      app.get('/keycloak.json', this.getKeycloak.bind(this));
      app.post('/join', this.postJoin.bind(this));
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
