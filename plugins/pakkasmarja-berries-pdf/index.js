/* jshint esversion: 6 */
/* global __dirname, Promise */
(() => {
  'use strict';
  
  const Promise = require('bluebird');
  const path = require('path');
  const fs = require('fs');
  const config = require('nconf');
  const wkhtmltopdf = require('wkhtmltopdf');
  const tmp = require('tmp');
  const Transform = require('stream').Transform;
  
  wkhtmltopdf.command = config.get('wkhtmltopdf:command');
  
  
  /**
   * PDF rendering functionalities for Pakkasmarja Berries
   */
  class Pdf {
    
    /**
     * Constructor
     * 
     * @param {Object} logger logger
     */
    constructor (logger) {
      this.logger = logger;
    }
    
    /**
     * Renders PDF from HTML
     * 
     * @param {String} html html string
     * @param {String} header header html (optional)
     * @param {String} footer footer html (optional)
     * @param {String} baseUrl base url
     * @return {Promise} promise for pdf stream
     */
    renderPdf(html, header, footer, baseUrl) {
      return this.createTempFiles(header, footer).then((tempFiles) => {
        const options = {
          "debug": false,
          "printMediaType": true
        };

        if (tempFiles.headerPath) {
          options.headerHtml = `file://${tempFiles.headerPath}`;
        }

        if (tempFiles.footerPath) {
          options.footerHtml = `file://${tempFiles.footerPath}`;
        }

        return new Promise((resolve, reject) => {
          wkhtmltopdf(html, options, (err, pdfStream) => {
            tempFiles.cleanup();

            if (err) {
              reject(err);
            } else {
              const transformStream = new Transform({
                transform(chunk, encoding, callback) {
                  this.push(chunk);
                  callback();
                }
              });

              pdfStream.pipe(transformStream);
              resolve(transformStream);
            }
          });
        });
      });
    }
    
    /**
     * Creates a temp file
     * 
     * @param {String} dirPath directory
     * @param {String} name file name
     * @param {String} data file data
     * @return {Promise} promise for file
     */
    createTempFile(dirPath, name, data) {
      const filePath = path.join(dirPath, name);
      
      return new Promise((resolve, reject) => {
        fs.writeFile(filePath, data, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve(filePath);
          }
        });
      });
    }
    
    /**
     * Creates temp files for header and footer files
     * 
     * @param {String} header header html (optional)
     * @param {String} footer footer html (optional)
     * @param {Function} callback callback function
     * @return {Promise} promise resolved with temp file names and cleanup callback
     */
    createTempFiles(header, footer) {
      return new Promise((resolve, reject) => {
        tmp.dir((err, dirPath, cleanup) => {
          if (err) {
            reject(err);
            return;
          }

          const filePromises = [];

          if (header) {
            filePromises.push(this.createTempFile(dirPath, 'header.html', header));
          }

          if (footer) {
            filePromises.push(this.createTempFile(dirPath, 'footer.html', footer));
          }

          return Promise.all(filePromises)
            .then((files) => {
              const headerPath = header ? files[0] : null;
              const footerPath = header ? files[1] : footer ? files[0] : null;

              resolve({
                headerPath: headerPath,
                footerPath: footerPath, 
                cleanup: () => {
                  files.forEach((file) => {
                    fs.unlinkSync(file);  
                  });
                  
                  cleanup();
                }
              });
            })
            .catch(reject);
        });
      });
    }
  } 
  
  module.exports = (options, imports, register) => {
    const logger = imports['logger'];
    const pdf = new Pdf(logger);
    
    register(null, {
      'pakkasmarja-berries-pdf': pdf
    });
  };
  
})();