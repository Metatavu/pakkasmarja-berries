import fetch, { RequestInit, Response } from "node-fetch";
import { config } from "../../config";
import { SapConfig, SapLoginRequestBody, SapSession } from "./types";
import { getLogger } from "log4js";

/**
 * Abstract service for SAP client
 */
export default class SapAbstractService {

  /**
   * Asynchronously fetch data from SAP Service Layer
   * 
   * @param url url to fetch from
   * @param options options to request
   * @returns Promise of response from SAP service Layer
   */
  protected async asyncFetch(url: string, options: RequestInit): Promise<any> {
    try {
      return await fetch(url, options)
        .then(response => response.json());
    } catch(e) {
      return Promise.reject(e);
    }
  }

  /**
   * Creates new session with SAP Service Layer
   * 
   * @returns promise of SAP session data
   */
  protected async createSession(): Promise<SapSession> {
    try {
      const sapSession = await this.login();
      getLogger().info(JSON.stringify(sapSession, null, 2));
      return sapSession;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * Ends given session with SAP Service Layer
   * 
   * @param session session data
   * @returns Promise that session has ended successfully
   */
  protected async endSession(session: SapSession): Promise<void> {
    try {
      const config = await this.getConfig();
      const response = await this.requestLogout(session, config);
      getLogger().info(JSON.stringify(session, null, 2));
      return await this.parseLogoutResponse(response);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /**
   * Returns config for SAP client
   * 
   * @returns Promise of SAP config object
   */
  protected getConfig(): Promise<SapConfig> {
    try {
      return Promise.resolve({ ...config().sapServiceLayer });
    } catch (e) {
      return Promise.reject(`Failed to get config for Sap Service Layer client: ${e}`);
    }
  }

  /**
   * Logs in to SAP Service Layer
   * 
   * @returns promise of SAP session data
   */
  private async login(): Promise<SapSession> {
    try {
      const config = await this.getConfig();
      const response = await this.requestLogin(config);
      if (response.status !== 200) {
        const json = await response.json();
        return Promise.reject(`Error doing login to SAP Service Layer: ${json.error.message.value}`);
      }

      return await this.parseLoginResponse(response);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /**
   * Executes login request to SAP Service Layer
   * 
   * @param config SAP config
   * @returns Promise of response to request
   */
  private requestLogin(config: SapConfig): Promise<Response> {
    const url = `${config.apiUrl}/Login`;
    const body: SapLoginRequestBody = {
      CompanyDB: config.companyDb,
      UserName: config.username,
      Password: config.password
    };

    const options: RequestInit = {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json"
      }
    }

    return fetch(url, options);
  }

  /**
   * Parses login response
   * 
   * @param response login response
   * @returns Promise of SAP session object
   */
  private async parseLoginResponse(response: Response): Promise<SapSession> {
    try {
      const rawHeaders = response.headers.raw();
      const cookies = rawHeaders["set-cookie"];
      if (!cookies) {
        return Promise.reject("No set-cookie header found from SAP Service Layer login response");
      }

      const sessionCookie = cookies.find(cookie => cookie.startsWith("B1SESSION"));
      if (!sessionCookie) {
        return Promise.reject(`No session cookie found from SAP Service Layer login response`);
      }

      const routeCookie = cookies.find(cookie => cookie.startsWith("ROUTEID"));
      if (!routeCookie) {
        return Promise.reject(`No route cookie found from SAP Service Layer login response`);
      }

      return {
        sessionId: this.parseIdFromCookie(sessionCookie),
        routeId: this.parseIdFromCookie(routeCookie)
      };
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /**
   * Executes logout request to SAP Service Layer
   * 
   * @param session expired SAP session
   * @param config SAP config
   * @returns Promise of response to request
   */
  private requestLogout = (session: SapSession, config: SapConfig): Promise<Response> => {
    const url = `${config.apiUrl}/Logout`;
    const options: RequestInit = {
      method: "POST",
      headers: {
        "Cookie": `B1SESSION=${session.sessionId}; ROUTEID=${session.routeId}`
      }
    }

    return fetch(url, options);
  }

  /**
   * Parses logout response from SAP Service Layer
   * 
   * @param response response
   * @returns Promise of correct response to logout request
   */
  private async parseLogoutResponse(response: Response): Promise<void> {
    try {
      if (response.status !== 204) {
        const json = await response.json();
        return Promise.reject(`Error doing logout to SAP Service Layer: ${json.error.message.value}`);
      }

      return Promise.resolve();
    } catch (e) {
      return Promise.reject(`Error doing logout to SAP Service Layer: ${e}`);
    }
  }

  /**
   * Parses ID from set-cookie header of SAP Service Layer login response
   * 
   * @param cookie set-cookie header
   * @returns parsed ID
   */
  private parseIdFromCookie = (cookie: string) => {
    return cookie.split(";")[0].split("=")[1];
  };

}
