/*jshint esversion: 6 */
/* global __dirname */

(() => {
  "use strict";

  const config = require("nconf");
  const FCM = require("fcm-push");
  const fs = require("fs");
  const uuid = require("uuid4");
  
  class PushNotifications {
    
    constructor (logger) {
      this.logger = logger;
      this.fcm = new FCM(config.get("firebase:server-key"));
    }
    
    sendPushNotification(to, title, body, sound) {
      const mode = config.get("mode");
      if (mode !== "PRODUCTION") {
        if (mode === "TEST") {
          const mockFolder = config.get("pushNotification:mockFolder");
          const outbox = `${mockFolder}/outbox`;

          const outboxFolders = outbox.split("/");
          const parents = [];

          while (outboxFolders.length) {
            const folder = outboxFolders.shift();
            const path = `${parents.join("/")}/${folder}`;

            if (!fs.existsSync(path)) {
              fs.mkdirSync(path);
            }

            parents.push(folder);
          }

          fs.writeFileSync(`${outbox}/${uuid()}`, JSON.stringify({to: to, title: title, body: body, sound: sound ? "default" : "silent" }));
        } else {
          this.logger.warn(`Skipping push notification because server is running in ${mode} mode`);
        }
        
        return;
      }

      const notificationSettings = {
        title: title,
        body: body,
        sound: sound ? "default" : "silent"
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
    const logger = imports["logger"];
    
    const pushNotifications = new PushNotifications(logger);
    register(null, {
      "pakkasmarja-berries-push-notifications": pushNotifications
    });
  };

})();
