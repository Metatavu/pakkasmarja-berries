/* jshint esversion: 6 */
/* global __dirname, Promise */
(() => {
  "use strict";
  
  const Promise = require('bluebird');
  const path = require('path');
  const fs = require('fs');
  const config = require('nconf');
  const Queue = require('better-queue');
  const SQLStore = require('better-queue-sql');

  /**
   * Task queue functionalities for Pakkasmarja Berries
   */
  class TaskQueue {
    
    /**
     * Constructor
     * 
     * @param {Object} logger logger
     * @param {Object} models database models
     * @param {Object} signature signature functionalities
     */
    constructor (logger, models, signature) {
      this.logger = logger;
      this.signature = signature;
      this.models = models;

      this.createQueue('contractDocumentStatus', {
        concurrent: 1,
        afterProcessDelay: 5000,
        maxTimeout: 20000
      }, this.checkContractDocumentSignatureStatus.bind(this));
      
      this.createQueue('contractDocumentStatusBatch', {
        concurrent: 1,
        afterProcessDelay: 5000,
        maxTimeout: 20000
      }, this.fillCheckContractDocumentSignatureStatusQueue.bind(this));
      
      this.enqueueContractDocumentStatusBatchQueueTask();
    }

    /**
     * Creates new task queue
     * 
     * @param {String} name name
     * @param {Object} options options
     * @param {Function} fn fn
     */
    createQueue(name, options, fn) {
      this[`${name}Queue`] = new Queue(fn, options);
      this[`${name}Queue`].use(new SQLStore({
        dialect: 'mysql',
        tableName: `${config.get('tasks:tableName')}_${name}`,
        dbname: config.get('mysql:database'),
        host: config.get('mysql:host') || 'localhost',
        port: config.get('mysql:port') || 3306,
        username: config.get('mysql:username'),
        password: config.get('mysql:password')
      }));
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
     * Adds task to contractDocumentStatusQueue
     * 
     * @param {int} contractDocumentId id
     */
    enqueueContractDocumentStatusTask(contractDocumentId) {
      this.contractDocumentStatusQueue.push({id: contractDocumentId, contractDocumentId: contractDocumentId});
    }
    
    /**
     * Adds task to contractDocumentStatusBatchQueue
     */
    enqueueContractDocumentStatusBatchQueueTask() {
      this.contractDocumentStatusBatchQueue.push({id: 1});
    }
    
    /**
     * Fills the checkContractDocumentSignatureStatus queue with unsigned contract documents
     */
      async fillCheckContractDocumentSignatureStatusQueue() {
      try {
        const unsignedContractDocuments = await this.models.listContractDocumentsBySigned(false);
        unsignedContractDocuments.forEach((unsignedContractDocument) => {
          this.enqueueContractDocumentStatusTask(unsignedContractDocument.id);
        });
      } catch (err) {
        this.logger.error('Error processing queue', err);
      } finally {
        this.enqueueContractDocumentStatusBatchQueueTask();
      }
    }
    
    /**
     * Task to check contract document signature status from visma sign
     * 
     * @param {object} data data given to task
     * @param {function} callback callback function
     */
    async checkContractDocumentSignatureStatus(data, callback) {
      let documentSigned = false;
      try {
        const contractDocument = await this.models.findContractDocumentById(data.contractDocumentId);
        if (!contractDocument.signed) {
          const response = await this.signature.getDocumentStatus(contractDocument.vismaSignDocumentId);
          const documentStatus = response ? response.status : null;
          if (documentStatus === 'signed') {
            documentSigned = true;
            this.models.updateContractDocumentSigned(data.contractDocumentId, true);
          }
        } else {
          documentSigned = true;
        }
      } catch(err) {
        this.logger.error('Error finding document status with', err);
      } finally {
        if (!documentSigned) {
          this.enqueueContractDocumentStatusTask(data.contractDocumentId);
        }
        callback(null);
      }
    }
  }
  
  module.exports = (options, imports, register) => {
    const logger = imports['logger'];
    const signature = imports['pakkasmarja-berries-signature'];
    const models = imports['pakkasmarja-berries-models'];
    const tasks = new TaskQueue(logger, models, signature);
    
    register(null, {
      'pakkasmarja-berries-tasks': tasks
    });
  };
  
})();