import { RequestMethod, WireMockAllRequestsResponse, WireMockRequestCountResponse } from "./types";
import * as request from "supertest";
import TestConfig from "../test-config";

/**
 * Test client for verifying and managing requests to WireMock
 */
export default new class SapWireMockTestClient {

  /**
   * Verifies request to WireMock
   *
   * @param method request method
   * @param path request path
   * @param count request count
   * @returns promise of whether request is verified or not
   */
  verify = async (method: RequestMethod, path: string) => {
    const response = await request(TestConfig.SAP_TEST_CLIENT_HOST)
      .post("/__admin/requests/count")
      .send(JSON.stringify({ method: method, url: `/b1s/v1${path}` }));

    return response.status === 200 ?
      (response.body as WireMockRequestCountResponse).count :
      false;
  }

  /**
   * Lists all requests received by WireMock
   */
  list = async () => {
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