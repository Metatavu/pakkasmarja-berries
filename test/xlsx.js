/*jshint esversion: 6 */
/* global __dirname */

(() => {
  "use strict";

  const xlsx = require("node-xlsx").default;

  /**
   * XLSX utility class for tests
   */
  class XLSX {
  
    /**
     * Extract XLSX data from buffer as JSON
     * 
     * @param {Buffer} buffer buffer
     * @return {Object} XLSX data as JSON
     */
    parseXlsx(buffer) {
      return JSON.parse(JSON.stringify(xlsx.parse(buffer)));
    }
    
  }
  
  module.exports = new XLSX();
  
})();