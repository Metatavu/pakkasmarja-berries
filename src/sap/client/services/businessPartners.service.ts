import AbstractService from "../abstract-service";
import fetch, { RequestInit, Response } from "node-fetch";
import * as _ from "lodash";
import { ListBusinessPartnersResponse, SapBusinessPartner } from "../types";

/**
 * Service providing business partners from SAP
 */
export default class SapBusinessPartnersService extends AbstractService {

  /**
   * Lists business partners from SAP Service Layer
   * 
   * @returns Promise of list of SAP business partners
   */
  public async listBusinessPartners(): Promise<SapBusinessPartner[]> {
    try {
      const config = await this.getConfig();
      const session = await this.getSession();
      const baseUrl = `${config.apiUrl}/BusinessPartners`;
      const countUrl = `${baseUrl}/$count`;
      const options: RequestInit = {
        method: "GET",
        headers: {
          "Cookie": `B1SESSION=${session.sessionId}; ROUTEID=${session.routeId}`
        }
      }

      const countResponse = await fetch(countUrl, options);
      const count = await this.parseCountFromResponse(countResponse);
      const baseItemUrl = `${baseUrl}?$select=GroupName,Number`;
      const itemUrls = this.getItemUrls(baseItemUrl, count);
      const responses = await Promise.all(
        itemUrls.map(url => this.asyncFetch(url, options))
      );

      return this.translateListItemsResponses(responses);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /**
   * Get list of request URLs fetching all items
   * 
   * @returns list of item URLs
   */
  private getItemUrls = (baseUrl: string, count: number) => {
    const itemUrls: string[] = [];
    for (let i = 0; i < count; i += 20) {
      itemUrls.push(`${baseUrl}&$skip=${i}`);
    }

    return itemUrls;
  }

  /**
   * Asynchronously fetch data from SAP Service Layer
   * 
   * @param url url to fetch from
   * @param options options to request
   * @returns Promise of list item group response
   */
  private async asyncFetch(url: string, options: RequestInit): Promise<ListBusinessPartnersResponse> {
    try {
      return await fetch(url, options)
        .then(response => response.json());
    } catch(e) {
      return Promise.reject(e);
    }
  }

  /**
   * Translates SAP Service Layer responses to list of business partners
   * 
   * @param responses list business partners responses to translate
   * @returns list of SAP export business partners
   */
  private translateListItemsResponses(responses: ListBusinessPartnersResponse[]): SapBusinessPartner[] {
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
        return Promise.reject("Item count was not number");
      }

      return count;
    } catch(e) {
      return Promise.reject(e);
    }
  }

}