import * as moment from "moment";
import { AuthenticationsApi, DocumentsApi, FilesApi, InvitationsApi } from "../generated/visma-sign-client/api";
import { config, VismaSign } from "../config";
import { VismaSignClientUtils } from "./utils";

const vismaSignConfig: VismaSign | null = config()["visma-sign"] || null;

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
    return await this.createInvitation(documentId);
  }

  /**
   * Creates document thru Visma Sign API
   *
   * @param {String} name name
   * @returns {Promise} Promise that resolves to the created document
   */
  async createDocument(name: string): Promise<string> {
    const documentData: { name: string, affiliates?: [{ code: any }] } = {
      name: `${name}_${moment().format("YYYYMMDDHHmmss")}`
    };

    if (vismaSignConfig && vismaSignConfig.affiliateCode) {
      documentData.affiliates = [{
        code: vismaSignConfig.affiliateCode
      }];
    }

    const documentsApi = new DocumentsApi();
    const document = { document: documentData };
    const requestDate = new Date();
    const authHeader = this.createAuthHeader("POST", requestDate, document, "/api/v1/document/");

    if (!authHeader) {
      throw new Error("Authentication failed");
    }

    return documentsApi.createDocument(document, {
      headers: this.createHeaders(authHeader, document, requestDate)
    }).then(({ response, body }) => {
      const locationHeader = response.headers["location"];

      if (response.statusCode !== 201 || !locationHeader) {
        throw new Error(`Could not create document. Response body ${JSON.stringify(body)}`);
      }

      return locationHeader.substring(locationHeader.lastIndexOf("/") + 1);
    });
  }

  /**
   * Creates headers
   * 
   * @param authHeader auth header
   * @param body request body
   * @param requestDate request date
   */
  createHeaders (authHeader: string, body: any, requestDate: Date) {
    return {
      "Authorization": authHeader,
      "contentMD5": body ? VismaSignClientUtils.createBodyHash(JSON.stringify(body)) : "",
      "Date": VismaSignClientUtils.formatDate(requestDate)
    }
  }

  /**
   * Creates an auth header
   * 
   * @param method request method 
   * @param requestDate request date
   * @param body request body
   * @param path request path
   */
  createAuthHeader (method: string, requestDate: Date, body: any, path: string) {
    if (!vismaSignConfig) {
      return;
    }

    const { clientId, clientSecret } = vismaSignConfig;

    return VismaSignClientUtils.createAuthorizationHeader(
      clientId, 
      clientSecret, 
      method,
      body ? JSON.stringify(body) : "", 
      "application/json",
      requestDate,
      path
    );
  }

  /**
   * Cancel document thru Visma Sign API
   *
   * @param {String} documentId id of the document which file is to be cancel
   * @returns {Promise} Promise for cancel response
   */
  async cancelDocument(documentId: string) {
    const documentsApi = new DocumentsApi();

    const requestDate = new Date();
    const authHeader = this.createAuthHeader("POST", requestDate, undefined, `/api/v1/document/${documentId}/cancel`);

    if (!authHeader) {
      return;
    }

    return documentsApi.cancelDocument(documentId, {
      headers: this.createHeaders(authHeader, undefined, requestDate)
    });
  }

  /**
   * Delete document thru Visma Sign API
   *
   * @param {String} documentId id of the document which file is to be deleted
   * @returns {Promise} Promise for cancel response
   */
  deleteDocument(documentId: string) {
    const documentsApi = new DocumentsApi();
    const requestDate = new Date();
    const authHeader = this.createAuthHeader("DELETE", requestDate, undefined, `/api/v1/document/${documentId}`);

    if (!authHeader) {
      return;
    }

    return documentsApi.deleteDocument(documentId, {
      headers: this.createHeaders(authHeader, undefined, requestDate)
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
    const filesApi = new FilesApi();
    const requestDate = new Date();
    const authHeader = this.createAuthHeader("POST", requestDate, data, `/api/v1/document/${documentId}/files?filename=${filename}`);

    if (!authHeader) {
      return;
    }

    return filesApi.addDocumentFile(data, documentId, filename, {
      headers: this.createHeaders(authHeader, data, requestDate)
    });
  }

  /**
   * Creates invitation for document
   *
   * @param {String} documentId id of document
   * @returns {Promise} Promise that resolves into redirect url
   */
  createInvitation(documentId: string) {
    const invitationsApi = new InvitationsApi();
    const requestDate = new Date();
    const authHeader = this.createAuthHeader("POST", requestDate, [{}], `/api/v1/document/${documentId}/invitations`);

    if (!authHeader) {
      return;
    }
    return invitationsApi.createDocumentInvitation([{}], documentId, {
      headers: this.createHeaders(authHeader, [{}], requestDate)
    }).then((response) => response.body[0]);
  }

  /**
   * Fulfills an invitation
   *
   * @param {String} invitationId invitation id
   * @param {String} returnUrl redirect url
   * @param {String} identifier ssn of person signing
   * @param {String} authService auth service id
   */
  fulfillInvitation(invitationId: string, returnUrl: string, identifier: string, authService: string) {
    const invitationsApi = new InvitationsApi();
    const requestDate = new Date();
    const body = {
      "returnUrl": returnUrl,
      "identifier": identifier,
      "authService": authService
    }
    const authHeader = this.createAuthHeader("POST", requestDate, body, `/api/v1/invitation/${invitationId}/signature`);

    if (!authHeader) {
      return;
    }

    return invitationsApi.fullfillInvitation(body, invitationId, {
      headers: this.createHeaders(authHeader, body, requestDate)
    }).then(result => ({ location: result.response.headers.location }));
  }

  /**
   * Returns document file for a document id
   *
   * @param {String} documentId document id
   * @returns {Blob} file as a blob
   */
  getDocumentFile(documentId: string) {
    const filesApi = new FilesApi();
    const requestDate = new Date();
    const authHeader = this.createAuthHeader("GET", requestDate, undefined, `/api/v1/document/${documentId}/files/0`);

    if (!authHeader) {
      return;
    }

    return filesApi.getDocumentFile(documentId, 0, {
      headers: this.createHeaders(authHeader, undefined, requestDate)
    }).then(response => response.body);
  }

  /**
   * Gets document status
   *
   * @param {String} documentId
   * @returns {Promise} for document status
   */
  getDocumentStatus(documentId: string) {
    const documentsApi = new DocumentsApi();
    const requestDate = new Date();
    const authHeader = this.createAuthHeader("GET", requestDate, undefined, `/api/v1/document/${documentId}`);

    if (!authHeader) {
      return;
    }

    return documentsApi.getDocumentStatus(documentId, {
      headers: this.createHeaders(authHeader, undefined, requestDate)
    }).then(response => response.body);
  }

  /**
   * Returns authentication methods
   */
  getAuthenticationMethods() {
    const authenticationsApi = new AuthenticationsApi();
    const requestDate = new Date();
    const authHeader = this.createAuthHeader("GET", requestDate, undefined, `/api/v1/auth/methods`);

    if (!authHeader) {
      return;
    }

    return authenticationsApi.getAuthenticationMethods(undefined, {
      headers: this.createHeaders(authHeader, undefined, requestDate)
    }).then(response => response.body);
  }

}