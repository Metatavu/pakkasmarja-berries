/*jshint esversion: 6 */
/* global __dirname */

(() => {
  "use strict";
  
  const fs = require("fs");
  const uuid = require('uuid4');
  const config = require("nconf");
  const Mailgun = require("mailgun-js");
  
  class Mailer {
    
    constructor () {
      this.mailgun = config.get("mode") !== "TEST" ? Mailgun({apiKey: config.get("mail:api_key"), domain: config.get("mail:domain")}) : null;
    }
    
    /**
     * Send an email message
     * 
     * @param String sender email address
     * @param String to recipient
     * @param String subject email subject
     * @param String contents email contects as plain text 
     */
    send(sender, to, subject, contents) {
      const options = {
        from: sender,
        to: to,
        subject: subject,
        text: contents
      };

      if (config.get("mode") !== "TEST") {
        return this.mailgun.messages().send(options);
      } else {
        const mockFolder = config.get("mail:mockFolder");
        const outbox = `${mockFolder}/outbox`;

        const outboxFolders = outbox.split('/');
        const parents = [];

        while (outboxFolders.length) {
          const folder = outboxFolders.shift();
          const path = `${parents.join('/')}/${folder}`;

          if (!fs.existsSync(path)) {
            fs.mkdirSync(path);
          }

          parents.push(folder);
        }

        return new Promise((resolve, reject) => {
          fs.writeFile(`${outbox}/${uuid()}`, JSON.stringify(options), (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });
      }
    }

  };

  module.exports = (options, imports, register) => {    
    const mailer = new Mailer();
    register(null, {
      "pakkasmarja-berries-mailer": mailer
    });
  };

})();
