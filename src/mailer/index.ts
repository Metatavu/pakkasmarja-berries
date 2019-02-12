/**
const fs = require("fs");
const uuid = require("uuid4");
const config = require("nconf");
const Mailgun = require("mailgun-js");
 */
import * as fs from "fs";
import * as Mailgun from "mailgun-js";
import * as config from "nconf";
import uuid from "uuid4";

export default new class Mailer {
 
  private mailgun: Mailgun.Mailgun | null;
  
  constructor () {
    this.mailgun = !this.inTestMode() ? Mailgun({apiKey: config.get("mail:api_key"), domain: config.get("mail:domain")}) : null;
  }

  /**
   * Returns whether mail is running in test mode
   */
  inTestMode() {
    return config.get("mode") === "TEST" || !config.get("mail:api_key") || !config.get("mail:domain");
  }
  
  /**
   * Send an email message
   * 
   * @param String sender email address
   * @param String to recipient
   * @param String subject email subject
   * @param String contents email contects as plain text 
   */
  send(sender: string, to: string, subject: string, contents: string) {
    const options = {
      from: sender,
      to: to,
      subject: subject,
      text: contents
    };

    if (!this.inTestMode() && this.mailgun) {
      return this.mailgun.messages().send(options);
    } else {
      const mockFolder = config.get("mail:mockFolder");
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

}