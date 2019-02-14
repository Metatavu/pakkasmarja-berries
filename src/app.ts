import * as http from "http";
import * as express from "express";
import * as ConnectSessionSequelize from "connect-session-sequelize";
import * as session from "express-session";
import * as Sequelize from "sequelize";
import * as Keycloak from "keycloak-connect";
import * as i18n from "i18n";
import * as bodyParser from "body-parser";
import * as cors from "cors";
import * as path from "path";

import Migration from "./migration";
import { initializeModels } from "./models";
import Api from "./rest";
import { config } from "./config";
import { getLogger, Logger, configure as log4jsConfigure } from "log4js";

log4jsConfigure({
  appenders: { console: { type: 'console' } },
  categories: { default: { appenders: ['console'], level: 'info' } }
});

process.on("unhandledRejection", (error) => {
  console.error("UNHANDLED REJECTION", error ? error.stack : null);
});

(async () => {
  const logger: Logger = getLogger();

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
  const httpServer = http.createServer(app);
  const SequelizeStore = ConnectSessionSequelize(session.Store);

  const sessionStore = new SequelizeStore({
    db: sequelize,
    table: "ConnectSession"
  });

  sessionStore.sync();

  const keycloak = new Keycloak({ store: sessionStore }, config().keycloak.rest);

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

  app.set('trust proxy', true);
  app.use(cors());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());
  app.use(express.static(path.join(__dirname, "../webapp")));
  app.use(express.static(path.join(__dirname, "../public")));
  app.use(i18n.init);
  app.set("views", path.join(__dirname, "views"));
  app.set("view engine", "pug"); 
  
  new Api(app, keycloak);
})();