import * as fs from "fs";
import * as config from "nconf";
import * as mysql from "mysql2/promise";

config.file({file: `${__dirname}/../../config.json`}).defaults(require(`${__dirname}/../../default-config.json`));

/**
 * Database utility class for tests
 */
export default new class Database {

  /**
   * Executes SQL script
   * 
   * @param {String} sql
   * @return {Promise} promise for results
   */
  executeSql(sql: string) {
    const options = {
      host: config.get('mysql:host'),
      user: config.get('mysql:username'),
      database: config.get('mysql:database'),
      password: config.get('mysql:password')
    };
    
    return mysql.createConnection(options)
      .then((connection: any) => {
        const executes = sql.split(/;\n/).map((statement) => {
          return connection.execute(statement);
        });
        
        return Promise.all(executes)
          .then(() => {
            return connection.end();
          });
    });
  }
  
  /**
   * Executes a SQL file
   * 
   * @param {String} parentFolder parent folder
   * @param {String} file file name
   * @return {Promise} promise for results
   */
  executeFile(parentFolder: string, file: string) {
    return new Promise((resolve, reject) => {
      fs.readFile(`${parentFolder}/${file}`, "utf8", (err, sql) => {
        if (err) {
          reject(err);
        } else {
          this.executeSql(sql)
            .then(resolve)
            .catch(reject);
        }
      });
    });
  }
  
  /**
   * Executes SQL files
   * 
   * @param {String} parentFolder parent folder
   * @param {String[]} files file names
   * @return {Promise} promise for results
   */
  executeFiles(parentFolder: string, files: string[]) {
    let result: Promise<any> = Promise.resolve();
    
    files.forEach((file: string) => {
      result = result.then(() => { return this.executeFile(parentFolder, file); });
    });
    
    return result;
  }
  
}