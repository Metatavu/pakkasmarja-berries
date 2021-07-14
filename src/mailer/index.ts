import * as fs from "fs";
import * as Mailgun from "mailgun-js";
import * as uuid from "uuid4";
import { config } from "../config";

/**
 * Class for sending emails trough Mailgun
 */
export default new class Mailer {

  private mailgun: Mailgun.Mailgun | null;

  constructor () {
    this.mailgun = !this.inTestMode() ?
      Mailgun({apiKey: config().mail.api_key, domain: config().mail.domain}) :
      null;
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
   * @param sender sender email address
   * @param to recipient address
   * @param subject email subject
   * @param contents email contents as plain text
   */
  send(sender: string, to: string, subject: string, contents: string, attachments?: Buffer) {
    const options = {
      from: sender,
      to: to,
      subject: subject,
      text: contents,
      attachments: attachments
    };

    if (!this.inTestMode() && this.mailgun) {
      return this.mailgun.messages().send(options);
    } else {
      return new Promise<void>((resolve, reject) => {
        fs.writeFile(
          `${config().mail.mockFolder}/outbox/${uuid()}`,
          JSON.stringify(options),
          { mode: 0o777 },
          err => err ? reject(err) : resolve()
        );
      });
    }
  }

}