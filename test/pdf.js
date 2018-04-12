/*jshint esversion: 6 */
/* global __dirname */

(() => {
  "use strict";

  const Promise = require('bluebird');
  const PDFParser = require("pdf2json");
  const fs = require('fs');
  const tmp = require('tmp');
  const config = require('nconf');
  config.file({file: `${__dirname}/../config.json`});
  
  /**
   * Pdf utility class for tests
   */
  class Pdf {
  
    /**
     * Extract PDF data from buffer
     * 
     * @param {Buffer} buffer buffer
     * @return {Promise} promise for extracted pdf data
     */
    extractPdfDataFromBuffer(buffer) {
      return new Promise((resolve, reject) => {
        tmp.tmpName((nameErr, path) => {
          if (nameErr) {
            reject(nameErr);
            return;
          }
 
          fs.writeFile(path, buffer, "binary", (err) =>{
            if (err) {
              reject(err);
              return;
            }
            
            this.extractPdfDataFromFile(path)
              .then((pdfData) => {
                fs.unlink(path);
                resolve(pdfData);
              })
              .catch((err) => {
                fs.unlink(path);
                reject(err);
              });
          });
           
        });
      });
    }
    
    /**
     * Extract PDF data from file
     * 
     * @param {String} file file
     * @return {Promise} promise for extracted pdf data
     */
    extractPdfDataFromFile(file) {
      return new Promise((resolve, reject) => {
        const pdfParser = new PDFParser(this, 1);
        pdfParser.on("pdfParser_dataError", errData => reject(errData.parserError));
        pdfParser.on("pdfParser_dataReady", pdfData => resolve({
          pdfData: pdfData, 
          rawTextContent: pdfParser.getRawTextContent()
        }));
        pdfParser.loadPDF(file);
      });
    }
    
  }
  
  module.exports = new Pdf();
  
})();