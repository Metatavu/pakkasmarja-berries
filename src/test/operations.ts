import * as request from "supertest";
import { Operation } from "../rest/model/models";
import TestConfig from "./test-config";

/**
 * Operations utility class for tests
 */
export default new class Operations {

  /**
   * Creates new operation and waits for it's completion
   *
   * @param {String} accessToken access token
   * @param {String} type operation type
   */
  createOperationAndWait(accessToken: string, type: string) {
    return this.createOperation(accessToken, type)
      .then((response: any) => {
        const operation: Operation = response.body;
        return this.waitOperationReport(accessToken, operation.operationReportId || "");
      });
  }

  /**
   * Creates new operation
   *
   * @param {String} accessToken access token
   * @param {String} type operation type
   */
  createOperation(accessToken: string, type: string) {
    return request(TestConfig.HOST)
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
  waitOperationReport(accessToken: string, operationReportId: string) {
    return new Promise((resolve, reject) => {
      let intervalId: NodeJS.Timer;
      let timeoutId: NodeJS.Timer;

      intervalId = setInterval(async () => {
        const operationReportResult = await this.checkOperationReport(accessToken, operationReportId);
        const operationReport = operationReportResult.body;
        const { failedCount, pendingCount } = operationReport;

        if (failedCount !== 0) {
          clearInterval(intervalId);
          clearTimeout(timeoutId);

          const itemsResult = await this.getOperationItems(accessToken, operationReportId);
          return reject(JSON.stringify(itemsResult.body));
        }

        if (pendingCount === 0) {
          clearInterval(intervalId);
          clearTimeout(timeoutId);

          return resolve(operationReport);
        }
      }, 1000);

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
  checkOperationReport(accessToken: string, operationReportId: string) {
    return request(TestConfig.HOST)
      .get(`/rest/v1/operationReports/${operationReportId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .set("Accept", "application/json")
      .expect(200);
  }

  /**
   * Lists operation items by operation report id
   *
   * @param {String} accessToken access token
   * @param {int} operationReportId operation report id
   */
  getOperationItems(accessToken: string, operationReportId: string) {
    return request(TestConfig.HOST)
      .get(`/rest/v1/operationReports/${operationReportId}/items`)
      .set("Authorization", `Bearer ${accessToken}`)
      .set("Accept", "application/json")
      .expect(200);
  }

}