import AbstractService from "../abstract-service";
import fetch, { RequestInit, Response } from "node-fetch";
import * as _ from "lodash";
import { ListItemGroupsResponse, SapItemGroup } from "../types";

/**
 * Service providing item groups from SAP
 */
export default class SapItemGroupsService extends AbstractService {

  /**
   * Lists item groups from SAP Service Layer
   * 
   * @returns Promise of list of SAP item groups
   */
  public async listItemGroups(): Promise<SapItemGroup[]> {
    try {
      const config = await this.getConfig();
      const session = await this.createSession();
      const baseUrl = `${config.apiUrl}/ItemGroups`;
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

      const select = "$select=GroupName,Number";
      const baseItemUrl = `${baseUrl}?${select}`;
      const itemUrls = this.getItemUrls(baseItemUrl, count);

      const responses = await Promise.all(
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
  private getItemUrls = (countUrl: string, count: number) => {
    const itemUrls: string[] = [];
    for (let i = 0; i < count; i += 100) {
      itemUrls.push(`${countUrl}&$skip=${i}`);
    }

    return itemUrls;
  }

  /**
   * Translates SAP Service Layer responses to list of item groups
   * 
   * @param responses list item groups responses to translate
   * @returns list of SAP export item groups
   */
  private translateListItemsResponses(responses: ListItemGroupsResponse[]): SapItemGroup[] {
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