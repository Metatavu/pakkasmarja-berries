import { BusinessPartnersApi } from "../generated/erp-services-client/api";
import { config } from "../config";
import * as request from "request";

/**
 * Describes an access token
 */
interface AccessToken {
  created: Date;
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_expires_in?: number;
};

/**
 * Utility class for loading ERP APIs with predefined configuration
 */
export default class ErpClient {

  /**
   * Gets initialized BusinessPartners API
   *
   * @param auth authentication
   * @returns initialized funds API
   */
  public static getBusinessPartnersApi = async (): Promise<BusinessPartnersApi> => (
    await ErpClient.applyAuthentication(new BusinessPartnersApi(ErpClient.getBasePath()))
  );

  /**
   * Applies authentication to API instance
   * 
   * @param api API instance
   */
  private static applyAuthentication = async (api: any): Promise<any> => {
    const accessToken = await ErpClient.getAccessToken();
    api.accessToken = accessToken.access_token;
    return api;
  }

  /**
   * Returns base path for given API name
   * 
   * @returns base path for API
   */
  private static getBasePath() {
    const erpConfig = config().erp;
    return erpConfig.url;
  }

  /**
   * Resolves an access token and returns it
   * 
   * @returns an access token
   */
  private static getAccessToken = (): Promise<AccessToken> => {
    return new Promise((resolve, reject) => {
      const erpConfig = config().erp;
      const keycloakConfig = config().keycloak.admin;

      const url = `${keycloakConfig.baseUrl}/realms/${keycloakConfig.realm}/protocol/openid-connect/token`;
  
      const body = new URLSearchParams();
      body.append("client_id", keycloakConfig.client_id);
      body.append("client_secret", keycloakConfig.client_secret);
      body.append("username", erpConfig.username);
      body.append("password", erpConfig.password);
      body.append("grant_type", "password");

      const options = { body: body.toString(), headers: { "content-type": "application/x-www-form-urlencoded" } };
  
      request.post(url, options, (error, response, body) => {
        if (error) {
          reject(error);
        } else {
          if (response.statusCode && response.statusCode >= 200 && response.statusCode <= 299) {
            resolve(JSON.parse(body));
          } else {
            reject(body);
          }
        }
      });
    });
  }

}