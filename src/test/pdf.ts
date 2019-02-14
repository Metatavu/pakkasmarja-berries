import * as fs from "fs";
import * as tmp from "tmp";
import * as PDFParser from "pdf2json";

import * as config from "nconf";
config.file({file: `${__dirname}/../../config.json`}).defaults(require(`${__dirname}/../../default-config.json`));

/**
 * Pdf utility class for tests
 */
export default new class Pdf {

  /**
   * Extract PDF data from buffer
   * 
   * @param {Buffer} buffer buffer
   * @return {Promise} promise for extracted pdf data
   */
  extractPdfDataFromBuffer(buffer: Buffer) {
    return new Promise((resolve, reject) => {
      tmp.tmpName((nameErr: any, path: string) => {
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
              fs.unlinkSync(path);
              resolve(pdfData);
            })
            .catch((err) => {
              fs.unlinkSync(path);
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
  extractPdfDataFromFile(file: string) {
    return new Promise((resolve, reject) => {
      const pdfParser = new PDFParser(this, 1);
      pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError));
      pdfParser.on("pdfParser_dataReady", (pdfData: any) => resolve({
        pdfData: pdfData, 
        rawTextContent: pdfParser.getRawTextContent()
      }));
      pdfParser.loadPDF(file);
    });
  }
  
}