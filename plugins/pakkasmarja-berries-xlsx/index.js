/* jshint esversion: 6 */
/* global __dirname, Promise */
(() => {
  "use strict";
  
  const xlsx = require("node-xlsx").default;
  
  /**
   * Excel rendering functionalities for Pakkasmarja Berries
   */
  class Excel {
    
    /**
     * Constructor
     * 
     * @param {Object} logger logger
     */
    constructor (logger) {
      this.logger = logger;
    }

    /**
     * Builds an Excel file
     * 
     * @param {String} name file name
     * @param {Object[]} columnHeaders column header array 
     * @param {Object[]} rows row datas array
     * @returns {Buffer} Excel file as buffer 
     */
    buildXLSX(name, columnHeaders, rows) {
      const data = [];

      data.push(columnHeaders);

      rows.forEach((row) => {
        data.push(row);
      });

      return xlsx.build([{name: name, data: data}]);
    }
    
  } 
  
  module.exports = (options, imports, register) => {
    const logger = imports["logger"];
    const excel = new Excel(logger);
    
    register(null, {
      "pakkasmarja-berries-xlsx": excel
    });
  };
  
})();