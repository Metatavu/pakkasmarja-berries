/*jshint esversion: 6 */
/* global __dirname */

(() => {
  "use strict";

  /**
   * Utility class for test requests
   */
  class RequestUtils {

    /** 
     * Creates binary parser for supertest
    */
    createBinaryParser() {
      return (res, callback) => {
        res.setEncoding("binary");
        res.data = "";
        res.on("data", (chunk) => {
          res.data += chunk;
        });
        
        res.on("end", () => {
          callback(null, new Buffer(res.data, "binary"));
        });
      };
    }
  
  }
  
  module.exports = new RequestUtils();
  
})();