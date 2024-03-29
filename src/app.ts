import * as http from "http";
import * as express from "express";
import * as ConnectSessionSequelize from "connect-session-sequelize";
import * as session from "express-session";
import * as Sequelize from "sequelize";
import * as KeycloakConnect from "keycloak-connect";
import * as i18n from "i18n";
import * as bodyParser from "body-parser";
import * as cors from "cors";
import * as path from "path";
import * as Sentry from "@sentry/node";
import dotenv = require("dotenv");

import Migration from "./migration";
import { initializeModels } from "./models";
import Api from "./rest";
import SystemRoutes from "./routes/system-routes";
import MqttRoutes from "./routes/mqtt-routes";
import SignRoutes from "./routes/sign-routes";
import { config } from "./config";
import { getLogger, Logger, configure as log4jsConfigure } from "log4js";
import mqtt from "./mqtt";
import FileRoutes from "./routes/file-routes";
import taskQueue from "./tasks";

log4jsConfigure({
  appenders: { console: { type: 'console' } },
  categories: { default: { appenders: ['console'], level: 'info' } }
});

process.on("unhandledRejection", (error) => {
  console.error("UNHANDLED REJECTION", error ? error : null);
});

(async () => {
  const logger: Logger = getLogger();

  dotenv.config();

  const sequelize = new Sequelize(config().mysql.database, config().mysql.username, config().mysql.password, {
    logging: false,
    host: config().mysql.host,
    dialect: "mysql",
    pool: Object.assign({
      max: 5,
      min: 0,
      idle: 10000
    })
  });

  (await (new Migration(sequelize)).migrationsUp()).forEach((migration) => {
    logger.info(`Migration ${migration.file} executed successfully`);
  });

  initializeModels(sequelize);

  const port = config().port || 3000;
  const app = express();

  // Sentry
  const sentryConfig = config().sentry || {};
  Sentry.init({
    dsn: sentryConfig.dsn,
    environment: sentryConfig.environment,
    integrations: [
      // enable HTTP calls tracing
      new Sentry.Integrations.Http({ tracing: true }),
      // enable Express.js middleware tracing
      new Sentry.Integrations.Express({ app }),
      // Automatically instrument Node.js libraries and frameworks
      ...Sentry.autoDiscoverNodePerformanceMonitoringIntegrations(),
    ],
  });

  // RequestHandler creates a separate execution context, so that all
  // transactions/spans/breadcrumbs are isolated across requests
  app.use(Sentry.Handlers.requestHandler());
  // TracingHandler creates a trace for every incoming request
  app.use(Sentry.Handlers.tracingHandler());

  const httpServer = http.createServer(app);
  const SequelizeStore = ConnectSessionSequelize(session.Store);

  const sessionStore = new SequelizeStore({
    db: sequelize,
    table: "ConnectSession"
  });

  sessionStore.sync();

  const keycloak = new KeycloakConnect({ }, config().keycloak.rest);

  httpServer.listen(port, () => {
    logger.info("Http server started");
  });

  i18n.configure({
    locales:["fi"],
    directory: `${__dirname}/../locales`,
    defaultLocale: "fi",
    autoReload: false
  });

  app.use(session({
    store: sessionStore,
    resave: false,
    saveUninitialized: true,
    secret: config()["session-secret"]
  }));

  app.use(keycloak.middleware({
    logout: "/logout"
  }));

  app.use((req, res, next) => {
    if (!req.path.includes("/system/ping") && req.method !== "OPTIONS") {
      logger.info(`${req.method} request into ${req.path}`);
    }

    next();
  });

  app.set('trust proxy', true);
  app.use(cors());
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
  app.use(bodyParser.raw({ inflate: true, type: "application/octet-stream" }));
  app.use(express.static(path.join(__dirname, "../webapp")));
  app.use(express.static(path.join(__dirname, "../public")));
  app.use(i18n.init);
  app.set("views", path.join(__dirname, "../views"));
  app.set("view engine", "pug");

  new Api(app, keycloak);
  new SystemRoutes(app);
  new MqttRoutes(app, keycloak);
  new SignRoutes(app);
  new FileRoutes(app, keycloak);

  // The error handler must be before any other error middleware and after all controllers
  app.use(Sentry.Handlers.errorHandler());

  mqtt.connect();
  taskQueue.start();
})();