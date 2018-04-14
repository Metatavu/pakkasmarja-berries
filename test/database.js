/*jshint esversion: 6 */
/* global __dirname */

(() => {
  "use strict";

  const Promise = require('bluebird');
  const mysql = require('mysql2/promise');
  const fs = require('fs');
  const config = require('nconf');
  config.file({file: `${__dirname}/../config.json`}).defaults(require(`${__dirname}/../default-config.json`));
  
  /**
   * Database utility class for tests
   */
  class Database {
  
    /**
     * Executes SQL script
     * 
     * @param {String} sql
     * @return {Promise} promise for results
     */
    executeSql(sql) {
      const options = {
        host: config.get('mysql:host'),
        user: config.get('mysql:username'),
        database: config.get('mysql:database'),
        password: config.get('mysql:password')
      };
      
      return mysql.createConnection(options)
        .then((connection) => {
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
    executeFile(parentFolder, file) {
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
    executeFiles(parentFolder, files) {
      let result = Promise.resolve();
      
      files.forEach((file) => {
        result = result.then(() => { return this.executeFile(parentFolder, file); });
      });
      
      return result;
    }
    
  }
  
  module.exports = new Database();
  
})();