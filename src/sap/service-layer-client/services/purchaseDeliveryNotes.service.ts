import AbstractService from "../abstract-service";
import fetch, { RequestInit } from "node-fetch";
import * as _ from "lodash";
import { SapPurchaseDeliveryNote } from "../types";

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
      const requestBody = JSON.stringify(purchaseDeliveryNote);
      const options: RequestInit = {
        method: "POST",
        headers: {
          "Cookie": `B1SESSION=${session.sessionId}; ROUTEID=${session.routeId}`
        },
        body: requestBody
      }

      const response = await this.asyncFetch(baseUrl, options) as SapPurchaseDeliveryNote;
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
  protected async asyncFetch(url: string, options: RequestInit): Promise<any> {
    try {
      const response = await fetch(url, options);

      if (response.status !== 201) {
        const errorResponse = JSON.stringify(await response.json(), null, 2);
        const requestBody = options.body ? JSON.parse(options.body.toString()) : "";
        const stringifiedBody = JSON.stringify(requestBody, null, 2);
        return Promise.reject(`Could not create delivery purchase note to SAP Service Layer. Error:\n${errorResponse}\nSent request body:\n${stringifiedBody}`);
      }

      return await response.json();
    } catch(e) {
      return Promise.reject(e);
    }
  }

}