/* jshint esversion: 6 */
/* global __dirname, Promise */
(() => {
  'use strict';
  
  const Promise = require("bluebird");
  const path = require("path");
  const fs = require("fs");
  const config = require("nconf");
  const VismaSignClient = require("visma-sign-client");
  const InvitationFullfillment = VismaSignClient.InvitationFullfillment; 
  const moment = require("moment");

  VismaSignClient.ApiClient.instance.clientId = config.get('visma-sign:clientId');
  VismaSignClient.ApiClient.instance.clientSecret = config.get('visma-sign:clientSecret');

  /**
   * Digital signature functionalities for Pakkasmarja Berries
   */
  class Signature {
    
    /**
     * Constructor
     * 
     * @param {Object} logger logger
     */
    constructor (logger) {
      this.logger = logger;
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
    async requestSignature(documentId, filename, pdfFile) {
      await this.addFile(documentId, pdfFile, filename);
      return await this.createInvitation(documentId);
    }

    /**
     * Creates document thru Visma Sign API
     * 
     * @param {String} name name
     * @returns {Promise} Promise that resolves to the created document
     */
    createDocument(name) {
      return this.documentsApi.createDocument({"document":{"name": `${name}_${moment().format("YYYYMMDDHHmmss")}`}}).then((data) => {
        const location = data.location;
        return location.substring(location.lastIndexOf('/') + 1);
      });
    }

    /**
     * Cancel document thru Visma Sign API
     * 
     * @param {String} documentId id of the document which file is to be cancel
     * @returns {Promise} Promise for cancel response
     */
    cancelDocument(documentId) {
      return this.documentsApi.cancelDocument(documentId);
    }

    /**
     * Delete document thru Visma Sign API
     * 
     * @param {String} documentId id of the document which file is to be deleted
     * @returns {Promise} Promise for cancel response
     */
    deleteDocument(documentId) {
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
    addFile(documentId, data, filename) {
      const options = {};
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
    createInvitation(documentId) {
      return this.invitationsApi.createDocumentInvitation([{}], documentId).then((data) => {
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
    fullfillInvitation(invitationId, returnUrl, identifier, authService) {
      const body = InvitationFullfillment.constructFromObject({
        "returnUrl": returnUrl,
        "identifier": identifier,
        "authService": authService
      });

      return this.invitationsApi.fullfillInvitation(body, invitationId);
    }
    
    /**
     * Gets document status
     * 
     * @param {String} documentId
     * @returns {Promise} for document status
     */
    getDocumentStatus(documentId) {
      return this.documentsApi.getDocumentStatus(documentId);
    }

    /**
     * Returns authentication methods
     */
    getAuthenticationMethods() {
      return this.authenticationsApi.getAuthenticationMethods();
    }
    
  }
  
  module.exports = (options, imports, register) => {
    const logger = imports['logger'];
    const sign = new Signature(logger);
    
    register(null, {
      'pakkasmarja-berries-signature': sign
    });
  };
  
})();