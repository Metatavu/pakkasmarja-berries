/* jshint esversion: 6 */
/* global __dirname */
(() => {
  "use strict";
  
  const architect = require("architect");
  const http = require("http");
  const path = require("path");
  const express = require("express");
  const morgan = require("morgan");
  const bodyParser = require("body-parser");
  const config = require("nconf");
  const Keycloak = require("keycloak-connect");  
  const session = require("express-session");
  const i18n = require("i18n");
  const cors = require("cors");
  const SequelizeStore = require("connect-session-sequelize")(session.Store);
  
  config
    .env({
      separator: "__",
      lowerCase: true,
      parseValues: true,
      transform: (obj) => {
        obj.key = obj.key.replace(/base[uU]rl/g, "baseUrl");
        obj.key = obj.key.replace(/([^_])_([^_])/g, "$1-$2");
        return obj;
      }
    })
    .file({file: __dirname + "/config.json"})
    .defaults(require( __dirname + "/default-config.json"));
   
  const options = require(__dirname + "/options");
  const architectConfig = architect.loadConfig(__dirname + "/config.js");
  
  if (!options.isOk()) {
    options.printUsage();
    process.exitCode = 1;
    return;
  }
  
  process.on("unhandledRejection", (error) => {
    console.error("UNHANDLED REJECTION", error ? error.stack : null);
  });
  
  architect.createApp(architectConfig, (err, architectApp) => {
    if (err) {
      console.error(err);
      process.exitCode = 1;
      return;
    }
    
    const sequelize = architectApp.getService("shady-sequelize").sequelize;
    const shadyMessages = architectApp.getService("shady-messages");
    const shadyWorker = architectApp.getService("shady-worker");
    const WebSockets = architectApp.getService("shady-websockets");
    const models = architectApp.getService("pakkasmarja-berries-models");
    const routes = architectApp.getService("pakkasmarja-berries-routes");
    const rest = architectApp.getService("pakkasmarja-berries-rest");
    const webSocketMessages = architectApp.getService("pakkasmarja-berries-ws-messages");
    const scheluders = architectApp.getService("pakkasmarja-berries-scheluders");
    const clusterMessages = architectApp.getService("pakkasmarja-berries-cluster-messages");
    const logger = architectApp.getService("logger");

    const port = options.getOption("port") || 3000;
    const host = options.getOption("host") || "localhost";

    shadyWorker.start(config.get("server-group"), port, host);
    
    const app = express();
    const httpServer = http.createServer(app);

    const sessionStore = new SequelizeStore({
      db: sequelize,
      table: "ConnectSession"
    });
    
    sessionStore.sync();
    
    const keycloak = new Keycloak({ store: sessionStore }, config.get("keycloak:rest"));
    
    httpServer.listen(port, () => {
      logger.info("Http server started");
    });

    i18n.configure({
      locales:["fi"],
      directory: `${__dirname}/locales`,
      defaultLocale: "fi",
      autoReload: false
    });

    app.use(session({
      store: sessionStore,
      resave: false,
      saveUninitialized: true,
      secret: config.get("session-secret")
    }));
    
    app.use(keycloak.middleware({
      logout: "/logout"
    }));
    
    app.use((req, res, next) => {
      req.pakkasmarjaBarries = {
        isLoggedIn: req.kauth && req.kauth.grant
      };
      
      next();
    });
    
    app.set('trust proxy', true);
    app.use(cors());
    app.use(morgan("combined"));
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());
    app.use(express.static(path.join(__dirname, "webapp")));
    app.use(express.static(path.join(__dirname, "public")));
    app.use(i18n.init);

    const webSockets = new WebSockets(httpServer, (sessionId, callback) => {
      try {
        if (!sessionId) {
          callback(false);
        } else {
          models.findSession(sessionId)
            .then((session) => {
              callback(session && session.userId);
            })
            .catch((err) => {
              logger.error(err);
              callback(false);
            });
        }
      } catch (e) {
        logger.error(`Websocket authentication failed ${e}`);
        callback(false);
      }
    });
    
    webSockets.on("close", (data) => {
      const client = data.client;
      const sessionId = client.getSessionId();
      
      //FIXME: remove timeout and fix this on the application side
      
      setTimeout(() => {
        models.deleteSession(sessionId)
          .then(() => {
            logger.info(`Session ${sessionId} removed`);
          })
          .catch((e) => {
            logger.error(`Failed to delete session ${e}`);
          });
      }, 1000 * 15);
    });
    
    scheluders.start();
    routes.register(app, keycloak);
    rest.register(app, keycloak);
    webSocketMessages.register(webSockets);
    clusterMessages.register(shadyMessages, webSockets);
  });

})();
