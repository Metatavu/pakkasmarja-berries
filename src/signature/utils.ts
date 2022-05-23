import * as crypto from "crypto";
import * as moment from "moment";

/**
 * Authorization header params
 */
type AuthorizationHeaderParams = {
  clientId: string;
  clientSecret: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  body: string | Buffer;
  contentType: "application/json" | "application/pdf";
  date: Date;
  path: string;
};

/**
 * Utility class for Visma Sign client
 */
export class VismaSignClientUtils {

  /**
   * Function to create authorization header to the Visma Sign client
   *
   * @param {AuthorizationHeaderParams} params - params to create authorization header
   * @param {string} params.clientId - Your client id
   * @param {string} params.clientSecret - Your client secret in base64 encoded format
   * @param {string} params.method - http method, GET, POST, PUT, DELETE
   * @param {string} params.body - request body in JSON format
   * @param {string} params.contentType - Content type, must be the same as in request headers
   * @param {date} params.date - Date that was sent in request headers
   * @param {string} params.path - The request path
   * @returns {string} A string that can be placed into Authorization - header
   */
  static createAuthorizationHeader(params: AuthorizationHeaderParams) {
    const { body, clientId, clientSecret, contentType, date, method, path } = params;

    const bodyHash = VismaSignClientUtils.createBodyHash(body);
    const formattedDate = VismaSignClientUtils.formatDate(date);

    const hmacString = [ method, bodyHash, contentType, formattedDate, path ].join("\n");
    const encrypted = VismaSignClientUtils.encrypt(clientSecret, hmacString);

    return `Onnistuu ${clientId}:${encrypted}`;
  }

  /**
   * Function to encrypt data with provided client secret
   *
   * @param {string} clientSecret - your client secret in base64 format
   * @param {string} data - data to be encrypted
   * @returns {string} Encrypted string in base64 format
   */
  static encrypt(clientSecret: string, data: string) {
    const hmac = crypto.createHmac("sha512", Buffer.from(clientSecret, "base64"));

    return hmac.update(Buffer.from(data, "utf8")).digest("base64");
  }

  /**
   * Function to calculate md5 hash from data
   *
   * @param {string} data - data to calculate hash from
   * @returns {string} base64 encoded md5 hash
   */
  static createBodyHash(data: string | Buffer | undefined) {
    return crypto.createHash("md5").update(data || "").digest("base64");
  }

  /**
   * Function to format date in required RFC 2822 format
   *
   * @param {date} date - date object to be formatted
   * @returns {string} date string in RFC 2822 format
   */
  static formatDate(date: Date) {
    return moment(date).format("ddd, DD MMM YYYY HH:mm:ss ZZ");
  }

}


