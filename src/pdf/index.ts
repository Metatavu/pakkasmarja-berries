import * as wkhtmltopdf from 'wkhtmltopdf';
import * as tmp from "tmp";
import * as fs from "fs";
import * as path from "path";
import { Stream } from "stream";
import { config } from '../config';
import { getLogger, Logger } from "log4js";

wkhtmltopdf.command = config().wkhtmltopdf.command;

interface TempFiles {
  headerPath: string|null,
  footerPath: string|null, 
  cleanup: () => void
} 

/**
 * PDF rendering functionalities for Pakkasmarja Berries
 */
export default new class Pdf {

  private logger: Logger = getLogger();
  
  /**
   * Renders PDF from HTML
   * 
   * @param {String} html html string
   * @param {String} header header html (optional)
   * @param {String} footer footer html (optional)
   * @param {String} baseUrl base url
   * @return {Promise} promise for pdf stream
   */
  public renderPdf(html: string, header?: string | null, footer?: string | null, baseUrl?: string | null): Promise<any> {
    return this.createTempFiles(header, footer).then((tempFiles: TempFiles) => {
      const options: { debug: boolean, printMediaType: boolean, headerHtml?: string, footerHtml?: string } = {
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
        wkhtmltopdf(html, options, (err: Error, pdfStream: Stream) => {
          tempFiles.cleanup();

          if (err) {
            this.logger.error("PDF printing failed", err);
            reject(err);
          } else {
            const transformStream = new Stream.Transform({
              transform(chunk, encoding, callback) {
                transformStream.push(chunk);
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
  private createTempFile(dirPath: string, name: string, data: string): Promise<string> {
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
  private createTempFiles(header?: string | null, footer?: string | null): Promise<TempFiles> {
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
              headerPath: headerPath || null,
              footerPath: footerPath || null, 
              cleanup: () => {
                files.forEach((file: string) => {
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