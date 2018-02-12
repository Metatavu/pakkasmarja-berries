/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';

  const mysql = require('mysql2/promise');
  const fs = require('fs');
  const config = require('nconf');
  config.file({file: `${__dirname}/../config.json`});
  
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
      return mysql.createConnection({
        host: config.get('mysql:host'),
        user: config.get('mysql:username'),
        database: config.get('mysql:database'),
        password: config.get('mysql:password')
      })
      .then((connection) => {
        return connection.execute(sql)
          .then(() => {
            connection.end();
          });
      });
    }
    
    /**
     * Executes a SQL file
     * 
     * @param {String} file path to file
     * @return {Promise} promise for results
     */
    executeFile(file) {
      return new Promise((resolve, reject) => {
        fs.readFile(file, "utf8", (err, sql) => {
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
    
  }
  
  module.exports = new Database();
  
})();