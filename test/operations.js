/*jshint esversion: 6 */
/* global __dirname */

(() => {
  "use strict";

  const Promise = require("bluebird");
  const request = require("supertest");
  
  /**
   * Operations utility class for tests
   */
  class Operations {
  
    /**
     * Creates new operation and waits for it's completion
     * 
     * @param {String} accessToken access token 
     * @param {String} type operation type
     */
    createOperationAndWait(accessToken, type) {
      return this.createOperation(accessToken, type)
        .then((response) => {
          const operation = response.body;
          return this.waitOperationReport(accessToken, operation.operationReportId);
        });
    }

    /**
     * Creates new operation
     * 
     * @param {String} accessToken access token 
     * @param {String} type operation type
     */
    createOperation(accessToken, type) {
      return request("http://localhost:3002")
        .post("/rest/v1/operations/")
        .set("Authorization", `Bearer ${accessToken}`)
        .set("Accept", "application/json")
        .send({
          type: type
        })
        .expect(200);
    }

    /**
     * Waits for operation report to have zero pending tasks 
     * 
     * @param {String} accessToken access token
     * @param {int} operationReportId operation report id
     */
    waitOperationReport(accessToken, operationReportId) {
      return new Promise((resolve, reject) => {
        let intervalId;
        let timeoutId;

        intervalId = setInterval(() => {
          this.checkOperationReport(accessToken, operationReportId)
            .then((result) => {
              const operationReport = result.body;
              console.log(result.body);

              if (operationReport.failedCount !== 0) {
                reject(result.body);
              } else if (operationReport.pendingCount === 0) {
                clearInterval(intervalId);
                clearTimeout(timeoutId);
                resolve(operationReport);
              }
            });
        }, 300);

        timeoutId = setTimeout(() => {
          clearInterval(intervalId);
          clearTimeout(timeoutId);
          reject("Timeout");          
        }, 60000);

      });
    }

    /**
     * Request a operation report
     * 
     * @param {String} accessToken access token 
     * @param {int} operationReportId operation report id
     */
    checkOperationReport(accessToken, operationReportId) {
      return request("http://localhost:3002")
        .get(`/rest/v1/operationReports/${operationReportId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .set("Accept", "application/json")
        .expect(200);
    }
    
  }
  
  module.exports = new Operations();
  
})();