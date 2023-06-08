import xlsx from "node-xlsx";

/**
 * XLSX utility class for tests
 */
export default new class XLSX {

  /**
   * Extract XLSX data from buffer as JSON
   *
   * @param {Buffer} buffer buffer
   * @return {Object} XLSX data as JSON
   */
  parseXlsx(buffer: Buffer) {
    return JSON.parse(JSON.stringify(xlsx.parse(buffer)));
  }

}