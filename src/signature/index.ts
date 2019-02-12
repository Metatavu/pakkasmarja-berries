import { getLogger, Logger } from "log4js";
import VismaSignClient from "visma-sign-client";
import * as config from "nconf";
import * as moment from "moment";

const InvitationFullfillment = VismaSignClient.InvitationFullfillment; 
VismaSignClient.ApiClient.instance.clientId = config.get('visma-sign:clientId');
VismaSignClient.ApiClient.instance.clientSecret = config.get('visma-sign:clientSecret');

/**
 * Digital signature functionalities for Pakkasmarja Berries
 */
export default new class Signature {

  private logger: Logger;
  private documentsApi: any;
  private filesApi: any;
  private invitationsApi: any;
  private authenticationsApi: any;
  
  /**
   * Constructor
   */
  constructor () {
    this.logger = getLogger();
    this.documentsApi = new VismaSignClient.DocumentsApi();
    this.filesApi = new VismaSignClient.FilesApi();
    this.invitationsApi = new VismaSignClient.InvitationsApi();
    this.authenticationsApi = new VismaSignClient.AuthenticationsApi();
  }

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
  createDocument(name: string): Promise<any> {
    const documentData: { name: string, affiliates?: [{ code: any }] } = {
      name: `${name}_${moment().format("YYYYMMDDHHmmss")}`
    };

    if (config.get("visma-sign:affiliateCode")) {
      documentData.affiliates = [{
        code: config.get("visma-sign:affiliateCode")
      }];
    }
    
    const document = VismaSignClient.Document.constructFromObject({
      document: documentData
    });

    return this.documentsApi.createDocument(document).then((data: any) => {
      const location = data.location;
      return location.substring(location.lastIndexOf("/") + 1);
    });
  }

  /**
   * Cancel document thru Visma Sign API
   * 
   * @param {String} documentId id of the document which file is to be cancel
   * @returns {Promise} Promise for cancel response
   */
  cancelDocument(documentId: string) {
    return this.documentsApi.cancelDocument(documentId);
  }

  /**
   * Delete document thru Visma Sign API
   * 
   * @param {String} documentId id of the document which file is to be deleted
   * @returns {Promise} Promise for cancel response
   */
  deleteDocument(documentId: string) {
    return this.documentsApi.deleteDocument(documentId);
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
    const options: { filename?: string } = {};
    if (filename) {
      options.filename = filename;
    }
    
    return this.filesApi.addDocumentFile(data, documentId, options);
  }
  
  /**
   * Creates invitation for document
   * 
   * @param {String} documentId id of document
   * @returns {Promise} Promise that resolves into redirect url
   */
  createInvitation(documentId: string) {
    return this.invitationsApi.createDocumentInvitation([{}], documentId).then((data: any[]) => {
      return data[0];
    });
  }

  /**
   * Fulfills an invitation
   * 
   * @param {String} invitationId invitation id 
   * @param {String} returnUrl redirect url
   * @param {String} identifier ssn of person signing
   * @param {String} authService auth service id
   */
  fullfillInvitation(invitationId: string, returnUrl: string, identifier: string, authService: string) {
    const body = InvitationFullfillment.constructFromObject({
      "returnUrl": returnUrl,
      "identifier": identifier,
      "authService": authService
    });

    return this.invitationsApi.fullfillInvitation(body, invitationId);
  }

  /**
   * Returns document file for a document id
   * 
   * @param {String} documentId document id
   * @returns {Blob} file as a blob 
   */
  getDocumentFile(documentId: string) {
    return this.filesApi.getDocumentFile(documentId, 0);
  }
  
  /**
   * Gets document status
   * 
   * @param {String} documentId
   * @returns {Promise} for document status
   */
  getDocumentStatus(documentId: string) {
    return this.documentsApi.getDocumentStatus(documentId);
  }

  /**
   * Returns authentication methods
   */
  getAuthenticationMethods() {
    return this.authenticationsApi.getAuthenticationMethods();
  }
  
}