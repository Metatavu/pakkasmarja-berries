/*jshint esversion: 6 */
/* global __dirname */

(() => {
  "use strict";

  const fs = require("fs");
  const config = require("nconf");
  config.file({file: `${__dirname}/../config.json`}).defaults(require(`${__dirname}/../default-config.json`));
  
  /**
   * PushNotification utility class for tests
   */
  class PushNotification {

    /**
     * Returns sent pushNotifications as JSON objects
     * 
     * @return Array sent pushNotifications as JSON objects
     */
    getOutbox() {
      const outbox = `${config.get("pushNotification:mockFolder")}/outbox`;

      if (!fs.existsSync(outbox)) {
        return [];
      }

      return fs.readdirSync(outbox).map((file) => {
        return JSON.parse(fs.readFileSync(`${outbox}/${file}`, "utf8"));
      });
    }

    /**
     * Clears outbox folder
     */
    clearOutbox() {
      const outbox = `${config.get("pushNotification:mockFolder")}/outbox`;
      if (fs.existsSync(outbox)) {
        fs.readdirSync(outbox).forEach((file) => {
          fs.unlinkSync(`${outbox}/${file}`);
        });
      }
    }
    
  }
  
  module.exports = new PushNotification();
  
})();