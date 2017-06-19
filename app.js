/* jshint esversion: 6 */
/* global __dirname */
(() => {
  'use strict';
  
  const architect = require('architect');
  const _ = require('lodash');
  const http = require('http');
  const util = require('util');
  const path = require('path');
  const express = require('express');
  const morgan = require('morgan');
  const request = require('request');
  const bodyParser = require('body-parser');
  const config = require('nconf');
  const Hashes = require('jshashes');
  const Keycloak = require('keycloak-connect');  
  const session = require('express-session');
  const CassandraStore = require("cassandra-store");
  const SHA256 = new Hashes.SHA256;
  
  config.file({file: __dirname + '/config.json'});
   
  const options = require(__dirname + '/options');
  const architectConfig = architect.loadConfig(__dirname + '/config.js');
  
  if (!options.isOk()) {
    options.printUsage();
    process.exitCode = 1;
    return;
  }
  
  architect.createApp(architectConfig, (err, architectApp) => {
    if (err) {
      console.error(err);
      process.exitCode = 1;
      return;
    }
    
    const shadyMessages = architectApp.getService('shady-messages');
    const shadyWorker = architectApp.getService('shady-worker');
    const WebSockets = architectApp.getService('shady-websockets');
    const pakkasmarjaBarriesModels = architectApp.getService('pakkasmarja-berries-models');
    const routes = architectApp.getService('pakkasmarja-berries-routes');
    const webSocketMessages = architectApp.getService('pakkasmarja-berries-ws-messages');
    const clusterMessages = architectApp.getService('pakkasmarja-berries-cluster-messages');
    const logger = architectApp.getService('logger');
    const workerId = shadyWorker.start(config.get("server-group"), options.getOption('port'), options.getOption('host'));

    const port = options.getOption('port');
    const host = options.getOption('host');
    const app = express();
    const httpServer = http.createServer(app);
    
    const sessionStore = new CassandraStore({
      table: "sessions_store.sessions",
      clientOptions: {
        contactPoints: config.get('cassandra:contact-points') || ['localhost'],
        keyspace: "sessions_store",
        "queryOptions": {
            "prepare": true
        }
      } 
    });
    
    const keycloak = new Keycloak({ store: sessionStore }, {
      "realm": config.get('keycloak:realm'),
      "auth-server-url": config.get('keycloak:auth-server-url'),
      "ssl-required": config.get('keycloak:ssl-required'),
      "resource": config.get('keycloak:resource'),
      "public-client": config.get('keycloak:public-client')
    });
    
    httpServer.listen(port, () => {
      logger.info('Http server started');
    });
    
    app.use(session({
      store: sessionStore,
      resave: false,
      saveUninitialized: true,
      secret: config.get('session-secret')
    }));
    
    app.use(keycloak.middleware({
      logout: '/logout'
    }));
    
    app.use((req, res, next) => {
      req.pakkasmarjaBarries = {
        isLoggedIn: req.kauth && req.kauth.grant
      };
      
      next();
    });
    
    app.use((req, res, next) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
      next();
    });

    app.use(morgan('combined'));
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(express.static(path.join(__dirname, 'public')));
    app.set('views', path.join(__dirname, 'views'));
    app.set('view engine', 'pug');
    
    const webSockets = new WebSockets(httpServer);
    
    routes.register(app, keycloak);
    webSocketMessages.register(webSockets);
    clusterMessages.register(shadyMessages, webSockets);

  });

})();