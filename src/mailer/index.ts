import * as fs from "fs";
import * as Mailgun from "mailgun-js";
import * as uuid from "uuid4";
import { config } from "../config";

export default new class Mailer {
 
  private mailgun: Mailgun.Mailgun | null;
  
  constructor () {
    this.mailgun = !this.inTestMode() ? Mailgun({apiKey: config().mail.api_key, domain: config().mail.domain}) : null;
  }

  /**
   * Returns whether mail is running in test mode
   */
  inTestMode() {
    return config().mode === "TEST" || !config().mail.api_key || !config().mail.domain;
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
    console.log("send", 1);

    const options = {
      from: sender,
      to: to,
      subject: subject,
      text: contents
    };

    console.log("send", 2);

    if (!this.inTestMode() && this.mailgun) {
      console.log("send", 3);
      return this.mailgun.messages().send(options);
    } else {
      console.log("send", 4);
      const mockFolder = config().mail.mockFolder;
      const outbox = `${mockFolder}/outbox`;

      const outboxFolders = outbox.split("/");
      const parents = [];
      console.log("send", 5);

      while (outboxFolders.length) {
        const folder = outboxFolders.shift();
        const path = `${parents.join("/")}/${folder}`;

        if (!fs.existsSync(path)) {
          fs.mkdirSync(path);
        }

        parents.push(folder);
      }
      console.log("send", 6);

      return new Promise((resolve, reject) => {
        fs.writeFile(`${outbox}/${uuid()}`, JSON.stringify(options), (err) => {
          console.log("send", 7, err);
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