const config = require('nconf');

module.exports = [
  {
    "packagePath": "shady-messages",
    "amqpUrl": config.get('amqp:url')
  },
  {
    "packagePath": "shady-sequelize",
    "host": "localhost",
    "database": "pakkasmarja",
    "username": "root",
    "password": "random",
    "dialect": "mysql"
  },
  {
    "packagePath": "architect-logger",
    "exitOnError": false,
    "transports": {
      "console": {
        "colorize": true,
        "level": "verbose"
      }
    }
  },
  "shady-websockets",
  "shady-worker",
  "./plugins/pakkasmarja-berries-models",
  "./plugins/pakkasmarja-berries-routes",
  "./plugins/pakkasmarja-berries-ws-messages",
  "./plugins/pakkasmarja-berries-cluster-messages",
  "./plugins/pakkasmarja-berries-user-management",
  "./plugins/pakkasmarja-berries-wordpress",
  "./plugins/pakkasmarja-berries-webhooks",
  "./plugins/pakkasmarja-berries-push-notifications"
];