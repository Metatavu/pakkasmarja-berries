import * as config from "nconf";

/**
 * Test config
 */
export default new class TestConfig {

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

};