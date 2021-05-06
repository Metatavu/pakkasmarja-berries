import AbstractService from "../abstract-service";
import fetch, { RequestInit, Response } from "node-fetch";
import * as _ from "lodash";
import { ListDeliveryPlacesResponse, SapDeliveryPlace } from "../types";
import { createStackedReject } from "../../../utils";

/**
 * Service providing delivery places from SAP
 */
export default class SapDeliveryPlacesService extends AbstractService {

  /**
   * Lists delivery places from SAP Service Layer
   * 
   * @returns Promise of list of SAP delivery places
   */
  public async listDeliveryPlaces(): Promise<SapDeliveryPlace[]> {
    try {
      const config = await this.getConfig();
      const session = await this.createSession();
      const baseUrl = `${config.apiUrl}/U_PFZ_TOIMITUSPAIKKA`;
      const countUrl = `${baseUrl}/$count`;
      const options: RequestInit = {
        method: "GET",
        headers: {
          "Cookie": `B1SESSION=${session.sessionId}; ROUTEID=${session.routeId}`,
          "Prefer": "odata.maxpagesize=100"
        }
      }

      const countResponse = await fetch(countUrl, options);
      const count = await this.parseCountFromResponse(countResponse);
      const itemUrls = this.getItemUrls(baseUrl, count);
      const responses = await Promise.all(
        itemUrls.map(url => this.asyncFetch(url, options))
      );

      await this.endSession(session);
      return this.translateListItemsResponses(responses);
    } catch (e) {
      return Promise.reject(createStackedReject("Failed to list SAP delivery places", e));
    }
  }

  /**
   * Get list of request URLs fetching all items
   *
   * @param baseUrl request base URL
   * @param count count of all items
   * @returns list of item URLs
   */
  private getItemUrls = (baseUrl: string, count: number) => {
    const itemUrls: string[] = [];
    for (let i = 0; i < count; i += 100) {
      itemUrls.push(`${baseUrl}?$skip=${i}`);
    }

    return itemUrls;
  }

  /**
   * Translates SAP Service Layer responses to list of delivery places
   * 
   * @param responses list delivery places responses to translate
   * @returns list of SAP delivery places
   */
  private translateListItemsResponses(responses: ListDeliveryPlacesResponse[]): SapDeliveryPlace[] {
    return _.flatten(responses.map(response => response.value));
  }

  /**
   * Returns count from response body
   * 
   * @param response response for SAP Service Layer count request
   * @returns Promise of item count as number
   */
  private async parseCountFromResponse(response: Response): Promise<number> {
    try {
      const countString = await response.text();
      const count = Number(countString);
      if (Number.isNaN(count)) {
        return Promise.reject(createStackedReject("Item count was not number"));
      }

      return count;
    } catch(e) {
      return Promise.reject(createStackedReject("Failed to parse count from response", e));
    }
  }

}