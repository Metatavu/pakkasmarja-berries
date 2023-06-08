import * as config from "nconf";
import { Config } from "../config";

/**
 * Test config
 */
export class TestConfig {

  constructor() {
    config.file({file: `${__dirname}/../../test/config.json`}).defaults(require(`${__dirname}/../../default-config.json`));
  }

  /**
   * Getter for test config
   *
   * @param key config key
   * @returns value
   */
  public get = (key: string) => {
    return config.get(key);
  }

  /**
   * Lists entire test config
   *
   * @returns test config object
   */
  public list = () => {
    return config.get() as Config;
  }

};

export default new TestConfig;