import AbstractService from "../abstract-service";
import fetch, { RequestInit } from "node-fetch";
import * as _ from "lodash";
import { SapStockTransfer } from "../types";

/**
 * Service providing stock transfers from SAP
 */
export default class SapSapStockTransfersService extends AbstractService {

  /**
   * Creates new stock transfer to SAP Service Layer
   *
   * @param stockTransfer stock transfer to be created
   * @returns Promise of created stock transfer
   */
  public async createStockTransfer(stockTransfer: SapStockTransfer): Promise<SapStockTransfer> {
    try {
      const config = await this.getConfig();
      const session = await this.createSession();
      const baseUrl = `${config.apiUrl}/StockTransfers`;
      const requestBody = JSON.stringify(stockTransfer);
      const options: RequestInit = {
        method: "POST",
        headers: {
          "Cookie": `B1SESSION=${session.sessionId}; ROUTEID=${session.routeId}`
        },
        body: requestBody
      }

      const response = await this.asyncFetch(baseUrl, options) as SapStockTransfer;
      await this.endSession(session);
      return response;
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /**
   * Asynchronously fetch data from SAP Service Layer
   * 
   * @param url url to fetch from
   * @param options options to request
   * @returns Promise of response from SAP service Layer
   */
  private async asyncFetch(url: string, options: RequestInit): Promise<any> {
    try {
      const response = await fetch(url, options);

      if (response.status !== 201) {
        return Promise.reject(`Could not create stock transfer to SAP Service Layer. Error: ${await response.json()}`);
      }

      return await response.json();
    } catch(e) {
      return Promise.reject(e);
    }
  }

}