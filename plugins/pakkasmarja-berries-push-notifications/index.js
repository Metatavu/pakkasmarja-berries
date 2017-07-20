/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';
  
  const _ = require('lodash');
  const config = require('nconf');
  const FCM = require('fcm-push');
  const Promise = require('bluebird');
  
  class PushNotifications {
    
    constructor (logger, models, userManagement) {
      this.logger = logger;
      this.models = models;
      this.userManagement = userManagement;
      this.fcm = new FCM(config.get('firebase:server-key'));
    }
    
    sendPushNotification(to, title, body, sound) {
      const message = {
        to: `/topics/${to}`,
        notification: {
          title: title,
          body: body,
          sound: sound ? 'news': null
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
    
  }

  module.exports = (options, imports, register) => {
    const logger = imports['logger'];
    const models = imports['pakkasmarja-berries-models'];
    const userManagement = imports['pakkasmarja-berries-user-management'];
    
    const pushNotifications = new PushNotifications(logger, models, userManagement);
    register(null, {
      'pakkasmarja-berries-push-notifications': pushNotifications
    });
  };

})();
