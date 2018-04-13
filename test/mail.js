/*jshint esversion: 6 */
/* global __dirname */

(() => {
  "use strict";

  const Promise = require('bluebird');
  const fs = require('fs');
  const config = require('nconf');
  config.file({file: `${__dirname}/../config.json`}).defaults(require(`${__dirname}/../default-config.json`));
  
  /**
   * Mail utility class for tests
   */
  class Mail {

    /**
     * Returns sent mails as JSON objects
     * 
     * @return Array sent mails as JSON objects
     */
    getOutbox() {
      const outbox = `${config.get("mail:mockFolder")}/outbox`;

      if (!fs.existsSync(outbox)) {
        return [];
      }

      return fs.readdirSync(outbox).map((file) => {
        return JSON.parse(fs.readFileSync(`${outbox}/${file}`));
      });
    }

    /**
     * Clears outbox folder
     */
    clearOutbox() {
      const outbox = `${config.get("mail:mockFolder")}/outbox`;
      if (fs.existsSync(outbox)) {
        fs.readdirSync(outbox).forEach((file) => {
          fs.unlinkSync(`${outbox}/${file}`);
        });
      }
    }
    
  }
  
  module.exports = new Mail();
  
})();