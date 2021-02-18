import AbstractService from "../abstract-service";
import fetch, { RequestInit, Response } from "node-fetch";
import * as _ from "lodash";
import { ListContractsResponse, SapContract } from "../types";
import * as moment from "moment";

/**
 * Service providing contracts from SAP
 */
export default class SapContractsService extends AbstractService {

  /**
   * Lists contracts from SAP Service Layer
   * 
   * @returns Promise of list of SAP contracts
   */
  public async listContracts(): Promise<SapContract[]> {
    try {
      const config = await this.getConfig();
      const session = await this.createSession();
      const baseUrl = `${config.apiUrl}/BlanketAgreements`;
      const startOfLastYear = moment().subtract(1, "year").startOf("year").format("YYYY-MM-DD");
      const filter = `$filter=StartDate%20ge%20%27${startOfLastYear}%27%20and%20(Status%20eq%20%27asApproved%27%20or%20Status%20eq%20%27asTerminated%27)`;
      const countUrl = `${baseUrl}/$count?${filter}`;
      const options: RequestInit = {
        method: "GET",
        headers: {
          "Cookie": `B1SESSION=${session.sessionId}; ROUTEID=${session.routeId}`,
          "Prefer": "odata.maxpagesize=100"
        }
      }

      const countResponse = await fetch(countUrl, options);
      const count = await this.parseCountFromResponse(countResponse);
      const baseItemUrl = `${baseUrl}?${filter}`;
      const itemUrls = this.getItemUrls(baseItemUrl, count);
      const responses: ListContractsResponse[] = await Promise.all(
        itemUrls.map(url => this.asyncFetch(url, options))
      );

      await this.endSession(session);
      return this.translateListItemsResponses(responses);
    } catch (e) {
      return Promise.reject(e);
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
      itemUrls.push(`${baseUrl}&$skip=${i}`);
    }

    return itemUrls;
  }

  /**
   * Asynchronously fetch data from SAP Service Layer
   * 
   * @param url url to fetch from
   * @param options options to request
   * @returns Promise of response from SAP service layer
   */
  private async asyncFetch(url: string, options: RequestInit): Promise<any> {
    try {
      return await fetch(url, options)
        .then(response => response.json());
    } catch(e) {
      return Promise.reject(e);
    }
  }

  /**
   * Translates SAP Service Layer responses to list of contracts
   * 
   * @param responses list contracts responses to translate
   * @returns list of SAP contracts
   */
  private translateListItemsResponses(responses: ListContractsResponse[]): SapContract[] {
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