import * as fs from "fs";
import * as config from "nconf";
config.file({file: `${__dirname}/../../config.json`}).defaults(require(`${__dirname}/../../default-config.json`));

/**
 * PushNotification utility class for tests
 */
export default new class PushNotification {

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

    return fs.readdirSync(outbox).map((file: string) => {
      return JSON.parse(fs.readFileSync(`${outbox}/${file}`, "utf8"));
    });
  }

  /**
   * Clears outbox folder
   */
  clearOutbox() {
    const outbox = `${config.get("pushNotification:mockFolder")}/outbox`;
    if (fs.existsSync(outbox)) {
      fs.readdirSync(outbox).forEach((file: string) => {
        fs.unlinkSync(`${outbox}/${file}`);
      });
    }
  }
  
}