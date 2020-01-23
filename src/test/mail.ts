import * as fs from "fs";
import * as config from "nconf";

config.file({file: `${__dirname}/../../test/config.json`}).defaults(require(`${__dirname}/../../default-config.json`));
  
/**
 * Mail utility class for tests
 */
export default new class Mail {

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
      return JSON.parse(fs.readFileSync(`${outbox}/${file}`, "utf8"));
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