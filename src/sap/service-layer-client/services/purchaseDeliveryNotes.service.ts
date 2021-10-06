import AbstractService from "../abstract-service";
import { RequestInit } from "node-fetch";
import * as _ from "lodash";
import { SapPurchaseDeliveryNote } from "../types";
import { createStackedReject } from "../../../utils";

/**
 * Service providing purchase delivery notes from SAP
 */
export default class SapPurchaseDeliveryNotesService extends AbstractService {

  /**
   * Creates new purchase delivery note to SAP Service Layer
   *
   * @returns Promise of created purchase delivery note
   */
  public async createPurchaseDeliveryNote(purchaseDeliveryNote: SapPurchaseDeliveryNote): Promise<SapPurchaseDeliveryNote> {
    try {
      const config = await this.getConfig();
      const session = await this.createSession();
      const baseUrl = `${config.apiUrl}/PurchaseDeliveryNotes`;
      const content = JSON.stringify(purchaseDeliveryNote);
      const options: RequestInit = {
        method: "POST",
        headers: {
          "Cookie": `B1SESSION=${session.sessionId}; ROUTEID=${session.routeId}`,
          "Content-Length": content.length.toString()
        },
        body: content
      }

      const response = await this.asyncFetch(baseUrl, options) as SapPurchaseDeliveryNote;
      await this.endSession(session);
      return response;
    } catch (e) {
      return Promise.reject(createStackedReject("Failed to create SAP purchase delivery note", e));
    }
  }
}