const config = require('nconf');

module.exports = [
  {
    "packagePath": "shady-messages",
    "amqpUrl": config.get('amqp:url')
  },
  {
    "packagePath": "shady-cassandra",
    "keyspace": 'berries',
    "contactPoints": config.get('cassandra:contact-points'),
    "migration": "alter"
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
  "./plugins/pakkasmarja-berries-webhooks"
];