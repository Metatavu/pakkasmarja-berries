import * as fs from "fs";
import * as config from "nconf";

config.file({file: `${__dirname}/../../test/config.json`}).defaults(require(`${__dirname}/../../default-config.json`));
  
/**
 * Mail utility class for tests
 */
export default new class Mail {

  /**
   * Constructor
   */
  constructor() {
    this.createFolder();
  }

  /**
   * Returns sent mails as JSON objects
   * 
   * @return Array sent mails as JSON objects
   */
  public getOutbox() {
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
  public clearOutbox() {
    const outbox = `${config.get("mail:mockFolder")}/outbox`;
    if (fs.existsSync(outbox)) {
      fs.readdirSync(outbox).forEach((file) => {
        fs.unlinkSync(`${outbox}/${file}`);
      });
    }
  }

  /**
   * Creates output folder if needed
   */
  private createFolder() {
    const outbox = `${config.get("mail:mockFolder")}/outbox`;

    const outboxFolders = outbox.split("/");
    const parents = [];

    while (outboxFolders.length) {
      const folder = outboxFolders.shift();
      const path = `${parents.join("/")}/${folder}`;

      if (!fs.existsSync(path)) {
        fs.mkdirSync(path, { mode: 0o777 });
      }

      parents.push(folder);
    }
  }
  
}