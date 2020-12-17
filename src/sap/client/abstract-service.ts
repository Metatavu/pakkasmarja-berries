import fetch, { RequestInit, Response } from "node-fetch";
import models, { SapServiceLayerSessionModel } from "../../models";
import * as moment from "moment";
import { config } from "../../config";
import { SapConfig, SapLoginRequestBody, SapSession } from "./types";



/**
 * Abstract service for SAP client
 */
export default class SapAbstractService {

  /**
   * Provides SAP session data
   * 
   * @returns promise of SAP session data
   */
  protected async getSession(): Promise<SapSession> {
    try {
      const sessionModel = await models.findSapServiceLayerSession(1);
      const valid = sessionModel && moment(sessionModel.expires).isSameOrAfter(moment().add(10, "minutes"));
      if (sessionModel) {
        if (valid) {
          return this.translateDatabaseSapSession(sessionModel);
        } else {
          await this.logout(sessionModel);
        }
      }

      const sapSession = await this.login();
      await models.upsertSapServiceLayerSession(1, sapSession.sessionId, sapSession.routeId, moment().add(30, "minutes").toDate());
      return sapSession;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * Returns config for SAP client
   * 
   * @returns Promise of SAP config object
   */
  protected getConfig(): Promise<SapConfig> {
    return new Promise((resolve, reject) => {
      const inTestMode = config().mode === "TEST";
      const apiUrl = inTestMode ? process.env.SAP_SERVICE_LAYER_API_URL : "http://localhost:1234";
      const companyDb = process.env.SAP_SERVICE_LAYER_COMPANY_DB;
      const user = process.env.SAP_SERVICE_LAYER_USER;
      const pass = process.env.SAP_SERVICE_LAYER_PASS;

      if (apiUrl && companyDb && user && pass) {
        resolve({ apiUrl, companyDb, user, pass });
      }

      reject("No config for SAP Service Layer found");
    });
  }

  /**
   * Logs in to SAP Service Layer
   * 
   * @returns promise of SAP session data
   */
  private async login(): Promise<SapSession> {
    try {
      const config = await this.getConfig();
      const response = await this.doLogin(config);
      if (response.status !== 200) {
        const json = await response.json();
        return Promise.reject(`Error doing login to SAP Service Layer: ${json.error.message.value}`);
      }

      return await this.parseSessionInfo(response);
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
  private doLogin(config: SapConfig): Promise<Response> {
    const url = `${config.apiUrl}/Login`;
    const body: SapLoginRequestBody = {
      CompanyDB: config.companyDb,
      UserName: config.user,
      Password: config.pass
    };

    const options: RequestInit = {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        "Cookie": "ROUTEID=.node1"
      }
    }

    return fetch(url, options);
  }

  /**
   * Parses session info from login response
   * 
   * @param response login response
   * @returns Promise of SAP session object
   */
  private async parseSessionInfo(response: Response): Promise<SapSession> {
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

      return {
        sessionId: this.parseIdFromCookie(sessionCookie),
        routeId: ".node1"
      };
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /**
   * Logs out from SAP Service Layer
   * 
   * @param session expired session
   * @returns Promise of successful logout
   */
  private async logout(session: SapServiceLayerSessionModel): Promise<void> {
    try {
      const config = await this.getConfig();
      const response = await this.doLogout(session, config);
      await this.parseLogout(response);
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
  private doLogout = (session: SapSession, config: SapConfig): Promise<Response> => {
    const url = `${config.apiUrl}/Logout`;
    const options: RequestInit = {
      method: "POST",
      headers: {
        "Cookie": `B1SESSION=${session.sessionId}; ROUTEID=.node1`
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
  private async parseLogout(response: Response): Promise<void> {
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
   * Translates database SAP Service Layer session model to SAP session
   * 
   * @param model database session model
   * @returns session model translated to SAP session
   */
  private translateDatabaseSapSession = (model: SapServiceLayerSessionModel): SapSession => ({
    sessionId: model.sessionId,
    routeId: model.routeId
  });

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