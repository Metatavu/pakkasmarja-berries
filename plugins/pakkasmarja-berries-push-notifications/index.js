/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';

  const config = require('nconf');
  const FCM = require('fcm-push');
  const Promise = require('bluebird');
  
  class PushNotifications {
    
    constructor (logger) {
      this.logger = logger;
      this.fcm = new FCM(config.get('firebase:server-key'));
    }
    
    sendPushNotification(to, title, body, sound) {
      const notificationSettings = {
        title: title,
        body: body,
        sound: sound ? 'default' : 'silent'
      };
      
      const message = {
        to: `/topics/${to}`,
        notification: notificationSettings
      };
      
      this.fcm.send(message)
        .then((response) => {
          this.logger.info(`Push notification sent with message ${response}`);
        })
        .catch((err) => {
         this.logger.info(`Push notification sending failed`, err);
        });
    }
    
  }

  module.exports = (options, imports, register) => {
    const logger = imports['logger'];
    
    const pushNotifications = new PushNotifications(logger);
    register(null, {
      'pakkasmarja-berries-push-notifications': pushNotifications
    });
  };

})();
