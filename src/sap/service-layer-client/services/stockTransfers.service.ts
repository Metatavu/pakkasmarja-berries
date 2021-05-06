import AbstractService from "../abstract-service";
import { RequestInit } from "node-fetch";
import * as _ from "lodash";
import { SapStockTransfer } from "../types";
import { createStackedReject } from "../../../utils";

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
      return Promise.reject(createStackedReject("Failed to create stock transfer", e));
    }
  }
}