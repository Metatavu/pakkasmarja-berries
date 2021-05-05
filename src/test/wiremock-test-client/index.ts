import { RequestMethod, WireMockAllRequestsResponse, WireMockRequestCountResponse } from "./types";
import * as request from "supertest";
import TestConfig from "../test-config";

/**
 * Test client for verifying and managing requests to WireMock
 */
export default new class SapWireMockTestClient {

  /**
   * Verifies matching request count to WireMock
   *
   * @param method request method
   * @param path request path
   * @returns promise of number of matching requests
   */
  verify = async (method: RequestMethod, path: string): Promise<number> => {
    const response = await request(TestConfig.SAP_TEST_CLIENT_HOST)
      .post("/__admin/requests/count")
      .send(JSON.stringify({ method: method, url: `/b1s/v1${path}` }));

    return response.status === 200 ?
      (response.body as WireMockRequestCountResponse).count :
      0;
  }

  /**
   * Lists all requests received by WireMock
   *
   * @returns promise of all requests response if query is successful, or undefined if query fails
   */
  list = async (): Promise<WireMockAllRequestsResponse | undefined> => {
    const response = await request(TestConfig.SAP_TEST_CLIENT_HOST)
      .get("/__admin/requests");

    return response.status === 200 ?
      response.body as WireMockAllRequestsResponse :
      undefined;
  }

  /**
   * Empties WireMock request log
   */
  empty = async (): Promise<void> => {
    await request(TestConfig.SAP_TEST_CLIENT_HOST).delete("/__admin/requests");
  }
}