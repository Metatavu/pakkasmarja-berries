/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';
  
  const _ = require('lodash');
  const config = require('nconf');
  const FCM = require('fcm-push');
  
  class PushNotifications {
    
    constructor (logger, models) {
      this.logger = logger;
      this.models = models;
      this.fcm = new FCM(config.get('firebase:server-key'));
    }
    
    notifyNewsItemPublish(title) {
      const message = {
        to: '/topics/news',
        notification: {
          title: 'Uusi uutinen',
          body: `Uusi uutinen otsikolla ${title} -julkaistu!`,
          sound: 'missile'
        }
      };

      this.fcm.send(message)
        .then((response) => {
          this.logger.info(`Push notification sent with message ${response}`);
        })
        .catch((err) => {
         this.logger.info(`Push notification sending failed`, err);
        });
    }
    
  };

  module.exports = (options, imports, register) => {
    const logger = imports['logger'];
    const models = imports['pakkasmarja-berries-models'];
    
    const pushNotifications = new PushNotifications(logger, models);
    register(null, {
      'pakkasmarja-berries-push-notifications': pushNotifications
    });
  };

})();
