import { BusinessPartnersApi, ContractsApi, PurchaseDeliveryNotesApi, StockTransfersApi } from "../generated/erp-services-client/api";
import { config } from "../config";
import * as request from "request";

/**
 * Generic Api model
 */
interface Api {
  accessToken: string | (() => string)
}

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
   * Gets initialized business partners API
   *
   * @returns initialized business partners API
   */
  public static getBusinessPartnersApi = async () => (
    await ErpClient.applyAuthentication(new BusinessPartnersApi(ErpClient.getBasePath()))
  );

  /**
   * Gets initialized contracts API
   *
   * @returns initialized contracts API
   */
  public static getContractsApi = async () => (
    await ErpClient.applyAuthentication(new ContractsApi(ErpClient.getBasePath()))
  );

  /**
   * Gets initialized purchase delivery notes API
   *
   * @returns initialized purchase delivery notes API
   */
  public static getPurchaseDeliveryNotesApi = async () => (
    await ErpClient.applyAuthentication(new PurchaseDeliveryNotesApi(ErpClient.getBasePath()))
  );

  /**
   * Gets initialized stock transfers API
   *
   * @returns initialized stock transfers API
   */
  public static getStockTransfersApi = async () => (
    await ErpClient.applyAuthentication(new StockTransfersApi(ErpClient.getBasePath()))
  );

  /**
   * Applies authentication to API instance
   *
   * @param api API instance
   */
  private static applyAuthentication = async <T extends Api>(api: T): Promise<T> => {
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
    const erpConfig = config().keycloak.erp;
    return erpConfig.url;
  }

  /**
   * Resolves an access token and returns it
   *
   * @returns an access token
   */
  private static getAccessToken = (): Promise<AccessToken> => {
    return new Promise((resolve, reject) => {
      const erpConfig = config().keycloak.erp;
      const keycloakConfig = config().keycloak.admin;

      const url = `${keycloakConfig.baseUrl}/realms/${keycloakConfig.realm}/protocol/openid-connect/token`;

      const body = new URLSearchParams();
      body.append("client_id", erpConfig.clientId);
      body.append("client_secret", erpConfig.clientSecret);
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