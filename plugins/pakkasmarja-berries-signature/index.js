/* jshint esversion: 6 */
/* global __dirname, Promise */
(() => {
  'use strict';
  
  const Promise = require('bluebird');
  const path = require('path');
  const fs = require('fs');
  const config = require('nconf');
  const VismaSignClient = require('visma-sign-client');

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
    }

    /**
     * Request signature for pdf file
     * 
     * @param {String} documentId document id
     * @param {String} filename file name
     * @param {Buffer} pdfFile Buffer that contains pdf file data
     * @returns {Promise} Return promise that resolves into redirect url
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
      return this.documentsApi.createDocument({"document":{"name": name}}).then((data) => {
        const location = data.location;
        return location.substring(location.lastIndexOf('/') + 1);
      });
    }

    /**
     * Cancel document thru Visma Sign API
     * 
     * @param {String} documentId id of the document which file is to be added
     * @returns {Promise} Promise for cancel response
     */
    cancelDocument(documentId) {
      return this.documentsApi.cancelDocument(documentId);
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
        const invitation = data[0];
        return `https://www.onnistuu.fi/fi/invitation/${invitation.uuid}/${invitation.passphrase}/`;
      });
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
    
  }
  
  module.exports = (options, imports, register) => {
    const logger = imports['logger'];
    const sign = new Signature(logger);
    
    register(null, {
      'pakkasmarja-berries-signature': sign
    });
  };
  
})();