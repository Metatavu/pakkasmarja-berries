import AbstractService from "../abstract-service";
import fetch, { RequestInit, Response } from "node-fetch";
import * as _ from "lodash";
import { ListContractsResponse, SapContract, SapContractStatusEnum } from "../types";
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
      const filter = this.escapeSapQuery(`$filter=StartDate ge '${startOfLastYear}' and (Status eq 'asApproved' or Status eq 'asTerminated')`);
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
   * Lists active contracts from SAP Service Layer by business partner
   * 
   * @param BPCode business partner code
   * @returns Promise of list of active SAP contracts of business partner
   */
  public async listActiveContractsByBusinessPartner(BPCode: string): Promise<SapContract[]> {
    try {
      const config = await this.getConfig();
      const session = await this.createSession();
      const baseUrl = `${config.apiUrl}/BlanketAgreements`;
      const startOfYear = moment().startOf("year").format("YYYY-MM-DD");
      const filter = this.escapeSapQuery(`$filter=StartDate ge '${startOfYear}' and BPCode eq '${BPCode}' and (Status eq 'asApproved' or Status eq 'asDraft' or Status eq 'asOnHold')`);
      const options: RequestInit = {
        method: "GET",
        headers: {
          "Cookie": `B1SESSION=${session.sessionId}; ROUTEID=${session.routeId}`,
          "Prefer": "odata.maxpagesize=100"
        }
      }

      const response = await this.asyncFetch(`${baseUrl}?${filter}`, options) as ListContractsResponse;
      await this.endSession(session);
      return this.translateListItemsResponses([ response ]);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /**
   * Finds contract from SAP Service Layer
   *
   * @param sapId SAP ID of contract
   * @returns promise of found SAP contract or undefined
   */
  public async findContract(agreementNo: string): Promise<SapContract | undefined> {
    try {
      const config = await this.getConfig();
      const session = await this.createSession();
      const url = `${config.apiUrl}/BlanketAgreements(${agreementNo})`;
      const options: RequestInit = {
        method: "GET",
        headers: {
          "Cookie": `B1SESSION=${session.sessionId}; ROUTEID=${session.routeId}`
        }
      }

      const response = await this.asyncFetch(url, options) as SapContract | undefined;
      await this.endSession(session);
      return response;
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /**
   * Creates contract to SAP Service layer
   *
   * @param contract SAP contract
   * @returns promise of SAP contract
   */
  public async createContract(contract: SapContract): Promise<SapContract> {
    try {
      const config = await this.getConfig();
      const session = await this.createSession();
      const url = `${config.apiUrl}/BlanketAgreements`;
      const options: RequestInit = {
        method: "POST",
        headers: {
          "Cookie": `B1SESSION=${session.sessionId}; ROUTEID=${session.routeId}`
        },
        body: JSON.stringify(contract)
      }

      const response = await this.asyncFetch(url, options) as SapContract;
      await this.endSession(session);
      return response;
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /**
   * Updates contract to SAP Service Layer
   * 
   * @param contract SAP contract
   * @returns promise of updated SAP contract
   */
  public async updateContract(contract: SapContract): Promise<SapContract> {
    try {
      if (!contract.AgreementNo) {
        return Promise.reject("sapContractsService.updateContract: no agreementNo in contract");
      }

      const config = await this.getConfig();
      const session = await this.createSession();
      const url = `${config.apiUrl}/BlanketAgreements(${contract.AgreementNo})`;
      const options: RequestInit = {
        method: "PATCH",
        headers: {
          "Cookie": `B1SESSION=${session.sessionId}; ROUTEID=${session.routeId}`
        },
        body: JSON.stringify(contract)
      }

      await this.asyncFetch(url, options);
      await this.endSession(session);

      const updatedContract = await this.findContract(contract.AgreementNo);
      if (!updatedContract) {
        return Promise.reject("could not find updated contract");
      }

      return updatedContract;
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /**
   * Updates contract status to SAP Service Layer
   * 
   * @param agreementNo contract agreement number
   * @param status SAP contract status
   * @returns promise of updated SAP contract
   */
  public async updateContractStatus(agreementNo: string, status: SapContractStatusEnum): Promise<void> {
    try {
      const config = await this.getConfig();
      const session = await this.createSession();
      const url = `${config.apiUrl}/BlanketAgreements(${agreementNo})`;
      const contract: Partial<SapContract> = { Status: status };
      const options: RequestInit = {
        method: "PATCH",
        headers: {
          "Cookie": `B1SESSION=${session.sessionId}; ROUTEID=${session.routeId}`
        },
        body: JSON.stringify(contract)
      }

      await this.asyncFetch(url, options);
      await this.endSession(session);
      return Promise.resolve();
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