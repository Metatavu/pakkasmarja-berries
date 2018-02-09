const config = require('nconf');

module.exports = [
  {
    "packagePath": "shady-messages",
    "amqpUrl": config.get('amqp:url')
  },
  {
    "packagePath": "shady-sequelize",
    "host": config.get('mysql:host'),
    "database": config.get('mysql:database'),
    "username": config.get('mysql:username'),
    "password": config.get('mysql:password'),
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
  "./plugins/pakkasmarja-berries-rest",
  "./plugins/pakkasmarja-berries-routes",
  "./plugins/pakkasmarja-berries-ws-messages",
  "./plugins/pakkasmarja-berries-cluster-messages",
  "./plugins/pakkasmarja-berries-user-management",
  "./plugins/pakkasmarja-berries-wordpress",
  "./plugins/pakkasmarja-berries-webhooks",
  "./plugins/pakkasmarja-berries-push-notifications",
  "./plugins/pakkasmarja-berries-scheluders",
  "./plugins/pakkasmarja-berries-utils"
];