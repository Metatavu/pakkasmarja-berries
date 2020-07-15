import * as fs from "fs";
import * as config from "nconf";
import * as mysql from "mysql2/promise";
import { fail } from "assert";

config.file({file: `${__dirname}/../../test/config.json`}).defaults(require(`${__dirname}/../../default-config.json`));

/**
 * Database utility class for tests
 */
export default new class Database {

  /**
   * Executes SQL script
   * 
   * @param sql sql script
   * @return promise for results
   */
  public async executeSql(sql: string) {
    const options = {
      host: config.get('mysql:host'),
      user: config.get('mysql:username'),
      database: config.get('mysql:database'),
      password: config.get('mysql:password')
    };

    const connection = await mysql.createConnection(options);
    const statements = sql.split(/;\n/);
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      await connection.execute(statement);
    }
    
    connection.destroy();
  }
  
  /**
   * Executes a SQL file
   * 
   * @param {String} parentFolder parent folder
   * @param {String} file file name
   * @return {Promise} promise for results
   */
  public async executeFile(parentFolder: string, file: string) {
    const sql = await this.readFile(parentFolder, file);
    return await this.executeSql(sql);
  }
  
  /**
   * Executes SQL files
   * 
   * @param {String} parentFolder parent folder
   * @param {String[]} files file names
   * @return {Promise} promise for results
   */
  public async executeFiles(parentFolder: string, files: string[]) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        await this.executeFile(parentFolder, file);
      } catch (e) {
        fail(`Failed to execute sql file ${file} with exception ${e.message}`);
      }
    }
  }

  /**
   * Read file as promise
   * 
   * @param parentFolder parent folder
   * @param file file name
   * @returns Promise for a file contents
   */
  private readFile(parentFolder: string, file: string): Promise<string> {
    return new Promise((resolve, reject) => {
      fs.readFile(`${parentFolder}/${file}`, "utf8", (err, contents) => {
        if (err) {
          reject(err);
        } else {
          resolve(contents);
        }
      });
    });
  }
  
}