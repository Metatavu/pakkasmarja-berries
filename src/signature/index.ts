import * as moment from "moment";
import { AuthenticationsApi, DocumentsApi, FilesApi, InvitationsApi } from "../generated/visma-sign-client/api";
import { config, VismaSign } from "../config";
import { VismaSignClientUtils } from "./utils";

/**
 * Request content type
 */
type RequestContentType = "application/json" | "application/pdf";

/**
 * Document data
 */
type DocumentData = {
  name: string,
  affiliates?: [{ code: any }]
}

/**
 * Request header options
 */
type RequestHeaderOptions = {
  body: any;
  contentType: RequestContentType;
  method: "POST" | "GET" | "PUT" | "DELETE";
  path: string;
  requestDate: Date;
};

/**
 * Visma Sign client configuration
 */
const vismaSignConfig: VismaSign | null = config()["visma-sign"] || null;

/**
 * Digital signature functionalities for Pakkasmarja Berries
 */
export default new class Signature {

  /**
   * Request signature for pdf file
   *
   * @param {String} documentId document id
   * @param {String} filename file name
   * @param {Buffer} pdfFile Buffer that contains pdf file data
   * @returns {Promise} Return promise that resolves into invitation
   */
  async requestSignature(documentId: string, filename: string, pdfFile: Buffer) {
    await this.addFile(documentId, pdfFile, filename);
    return this.createInvitation(documentId);
  }

  /**
   * Creates document thru Visma Sign API
   *
   * @param {String} name name
   * @returns {Promise} Promise that resolves to the created document
   */
  async createDocument(name: string): Promise<string> {
    const documentData: DocumentData = {
      name: `${name}_${moment().format("YYYYMMDDHHmmss")}`,
      affiliates: vismaSignConfig && vismaSignConfig.affiliateCode ?
        [{ code: vismaSignConfig.affiliateCode }] :
        undefined
    };

    const requestBody = { document: documentData };

    const result = await new DocumentsApi().createDocument(requestBody, {
      headers: this.createHeaders({
        method: "POST",
        requestDate: new Date(),
        body: requestBody,
        path: "/api/v1/document/",
        contentType: "application/json"
      })
    });

    const locationHeader = result.response.headers["location"];

    if (result.response.statusCode !== 201 || !locationHeader) {
      throw new Error(`Could not create document. Response body ${JSON.stringify(result.body)}`);
    }

    return locationHeader.substring(locationHeader.lastIndexOf("/") + 1);
  }

  /**
   * Cancel document through Visma Sign API
   *
   * @param {String} documentId id of the document which file is to be cancel
   * @returns {Promise} Promise for cancel response
   */
  cancelDocument(documentId: string) {
    return new DocumentsApi().cancelDocument(documentId, {
      headers: this.createHeaders({
        method: "POST",
        requestDate: new Date(),
        body: undefined,
        path: `/api/v1/document/${documentId}/cancel`,
        contentType: "application/json"
      })
    });
  }

  /**
   * Delete document thru Visma Sign API
   *
   * @param {String} documentId id of the document which file is to be deleted
   * @returns {Promise} Promise for cancel response
   */
  deleteDocument(documentId: string) {
    return new DocumentsApi().deleteDocument(documentId, {
      headers: this.createHeaders({
        method: "DELETE",
        requestDate: new Date(),
        body: undefined,
        path: `/api/v1/document/${documentId}`,
        contentType: "application/json"
      })
    });
  }

  /**
   * Adds file to the document
   *
   * @param {String} documentId id of the document which file is to be added
   * @param {Buffer} data file data
   * @param {String} filename filename, optional
   * @returns {Promise} Promise that resolves if file was properly added
   */
  addFile(documentId: string, data: Buffer, filename: string) {
    return new FilesApi().addDocumentFile(data, documentId, filename, {
      headers: this.createHeaders({
        method: "POST",
        requestDate: new Date(),
        body: data,
        path: `/api/v1/document/${documentId}/files?filename=${filename}`,
        contentType: "application/pdf"
      })
    });
  }

  /**
   * Creates invitation for document
   *
   * @param {String} documentId id of document
   * @returns {Promise} Promise that resolves into redirect url
   */
  async createInvitation(documentId: string) {
    const result = await new InvitationsApi().createDocumentInvitation([{}], documentId, {
      headers: this.createHeaders({
        method: "POST",
        requestDate: new Date(),
        body: [{}],
        path: `/api/v1/document/${documentId}/invitations`,
        contentType: "application/json"
      })
    });

    return result.body[0];
  }

  /**
   * Fulfills an invitation
   *
   * @param {String} invitationId invitation id
   * @param {String} returnUrl redirect url
   * @param {String} identifier ssn of person signing
   * @param {String} authService auth service id
   */
  async fulfillInvitation(invitationId: string, returnUrl: string, identifier: string, authService: string) {
    const body = { returnUrl, identifier, authService };

    const result = await new InvitationsApi().fullfillInvitation(body, invitationId, {
      headers: this.createHeaders({
        method: "POST",
        requestDate: new Date(),
        body: body,
        path: `/api/v1/invitation/${invitationId}/signature`,
        contentType: "application/json"
      })
    });

    return { location: result.response.headers.location };
  }

  /**
   * Returns document file for a document id
   *
   * @param {String} documentId document id
   * @returns {Blob} file as a blob
   */
  async getDocumentFile(documentId: string) {
    const result = await new FilesApi().getDocumentFile(documentId, 0, {
      headers: this.createHeaders({
        method: "GET",
        requestDate: new Date(),
        body: undefined,
        path: `/api/v1/document/${documentId}/files/0`,
        contentType: "application/json"
      })
    });

    return result.body;
  }

  /**
   * Gets document status
   *
   * @param {String} documentId document id
   * @returns {Promise} for document status
   */
  async getDocumentStatus(documentId: string) {
    const result = await new DocumentsApi().getDocumentStatus(documentId, {
      headers: this.createHeaders({
        method: "GET",
        requestDate: new Date(),
        body: undefined,
        path: `/api/v1/document/${documentId}`,
        contentType: "application/json"
      })
    });

    return result.body;
  }

  /**
   * Returns authentication methods
   */
  async getAuthenticationMethods() {
    const result = await new AuthenticationsApi().getAuthenticationMethods(undefined, {
      headers: this.createHeaders({
        method: "GET",
        requestDate: new Date(),
        body: undefined,
        path: `/api/v1/auth/methods`,
        contentType: "application/json"
      })
    });

    return result.body;
  }

  /**
   * Creates headers
   *
   * @param options header options
   */
  createHeaders(options: RequestHeaderOptions) {
    if (!vismaSignConfig) throw new Error("Service configuration missing");

    const { clientId, clientSecret } = vismaSignConfig;
    const { method, body, requestDate, contentType, path } = options;

    const authorization = VismaSignClientUtils.createAuthorizationHeader({
      clientId: clientId,
      clientSecret: clientSecret,
      method: method,
      body: this.getRequestBody(body),
      contentType: contentType,
      date: requestDate,
      path: path
    });

    return {
      "Authorization": authorization,
      "contentMD5": VismaSignClientUtils.createBodyHash(this.getRequestBody(body)),
      "Date": VismaSignClientUtils.formatDate(requestDate),
      "Content-Type": contentType
    }
  }

  /**
   * Get request body
   *
   * @param {any} body body
   * @returns {String | Buffer} request body
   */
  getRequestBody(body: any) {
    if (typeof body === "string" || body instanceof Buffer) {
      return body;
    }

    return JSON.stringify(body);
  }

}