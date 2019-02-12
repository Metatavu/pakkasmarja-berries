import xlsx from "node-xlsx";

/**
 * Excel rendering functionalities for Pakkasmarja Berries
 */
export default new class Excel {
  
  /**
   * Builds an Excel file
   * 
   * @param {String} name file name
   * @param {Object[]} columnHeaders column header array 
   * @param {Object[]} rows row datas array
   * @returns {Buffer} Excel file as buffer 
   */
  buildXLSX(name: string, columnHeaders: any[], rows: any[]): ArrayBuffer {
    const data = [];

    data.push(columnHeaders);

    rows.forEach((row) => {
      data.push(row);
    });

    return xlsx.build([{name: name, data: data}]);
  }
  
}