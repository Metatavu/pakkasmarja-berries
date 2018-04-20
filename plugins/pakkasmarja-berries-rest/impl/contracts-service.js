/*jshint esversion: 6 */
/* global __dirname */

(() => {
  "use strict";

  const fs = require("fs");
  const path = require("path");
  const _ = require("lodash");
  const Promise = require("bluebird");
  const Mustache = require("mustache");
  const pug = require("pug");
  const ApplicationRoles = require(`${__dirname}/../application-roles`);
  const AbstractContractsService = require(`${__dirname}/../service/contracts-service`);
  const Contract = require(`${__dirname}/../model/contract`);
  const AreaDetail = require(`${__dirname}/../model/area-detail`);
  const ContractDocumentSignRequest = require(`${__dirname}/../model/contract-document-sign-request`);
  const ContractDocumentTemplate = require(`${__dirname}/../model/contract-document-template`);
  const Price = require(`${__dirname}/../model/price`);
  const toArray = require("stream-to-array");
  const slugify = require("slugify");
  const moment = require("moment");
  const i18n = require("i18n");

  const config = require("nconf");
  const wkhtmltopdf = require("wkhtmltopdf");
  wkhtmltopdf.command = config.get("wkhtmltopdf:command");
  
  /**
   * Implementation for Contracts REST service
   */
  class ContractsServiceImpl extends AbstractContractsService {
    /**
     * Constructor for Contracts service
     * 
     * @param {Object} logger logger
     * @param {Object} models models
     * @param {Object} userManagement userManagement
     * @param {Object} pdf PDF rendering functionalities
     * @param {Object} xlsx Excel rendering functionalities
     * @param {Object} signature Digital signature functionalities
     * @param {Object} tasks task queue functionalities
     */
    constructor (logger, models, userManagement, pdf, xlsx, signature, tasks, pushNotifications) {
      super();
      
      this.logger = logger;
      this.models = models;
      this.userManagement = userManagement;
      this.pdf = pdf;
      this.xlsx = xlsx;
      this.signature = signature;
      this.tasks = tasks;
      this.pushNotifications = pushNotifications;
    }   

    /**
     * @inheritdoc
     */
    async createContract(req, res) {
      if (!this.hasRealmRole(req, ApplicationRoles.CREATE_CONTRACT)) {
        this.sendForbidden(res, "You have no permission to create contracts");
        return;
      }

      const contract = _.isObject(req.body) ? Contract.constructFromObject(req.body) : null;
      if (!contract) {
        this.sendBadRequest(res, "Failed to parse body");
        return;
      }

      if (!contract.contactId) {
        this.sendBadRequest(res, "contactId is required");
        return;
      }

      const deliveryPlace = await this.models.findDeliveryPlaceByExternalId(contract.deliveryPlaceId);
      const proposedDeliveryPlace = await this.models.findDeliveryPlaceByExternalId(contract.proposedDeliveryPlaceId || contract.deliveryPlaceId);
      const itemGroup = await this.models.findItemGroupByExternalId(contract.itemGroupId);

      if (!itemGroup) {
        this.sendBadRequest(res, "Invalid itemGroupId");
        return;
      }

      const userId = contract.contactId;
      const deliveryPlaceId = deliveryPlace ? deliveryPlace.id : null;
      const proposedDeliveryPlaceId = proposedDeliveryPlace ? proposedDeliveryPlace.id : null;
      const itemGroupId = itemGroup.id;
      const sapId = contract.sapId || null;
      const contractQuantity = contract.contractQuantity;
      const deliveredQuantity = contract.deliveredQuantity;
      const proposedQuantity = contract.proposedQuantity;
      const startDate = contract.startDate;
      const endDate = contract.endDate;
      const signDate = contract.signDate;
      const termDate = contract.termDate;
      const areaDetails = contract.areaDetails;
      const deliverAll = contract.deliverAll;
      const status = contract.status;
      const remarks = contract.remarks;
      const year = contract.year;
      const deliveryPlaceComment = contract.deliveryPlaceComment;
      const quantityComment = contract.quantityComment;
      const rejectComment = contract.rejectComment;

      const databaseContract = await this.models.createContract(userId, 
        year,
        deliveryPlaceId, 
        proposedDeliveryPlaceId, 
        itemGroupId, 
        sapId, 
        contractQuantity, 
        deliveredQuantity, 
        proposedQuantity, 
        startDate, 
        endDate, 
        signDate, 
        termDate, 
        status, 
        areaDetails ? JSON.stringify(areaDetails) : null,
        deliverAll,
        remarks, 
        deliveryPlaceComment, 
        quantityComment, 
        rejectComment);
      
      
      if (databaseContract.status === "DRAFT") {
        this.sendContractChangePushNotification(
          userId,
          `Uusi sopimusluonnos ${itemGroup.displayName || itemGroup.name} / ${year}`,
          `Uusi sopimusluonnos marjasta: ${itemGroup.displayName || itemGroup.name} odottaa tarkastusta.`);
      }
      
      res.status(200).send(await this.translateDatabaseContract(databaseContract));
    }
    
    /**
     * @inheritdoc
     */
    async findContract(req, res) {
      const contractId = req.params.id;
      if (!contractId) {
        this.sendNotFound(res);
        return;
      }
      
      const databaseContract = await this.models.findContractByExternalId(contractId);
      if (!databaseContract) {
        this.sendNotFound(res);
        return;
      }

      const loggedUserId = this.getLoggedUserId(req);
      if (loggedUserId !== databaseContract.userId && !this.hasRealmRole(req, ApplicationRoles.LIST_ALL_CONTRACTS)) {
        this.sendForbidden(res, "You have no permission to find this contract");
        return;
      }

      const expectedTypes = ["application/json", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
      const accept = this.getBareContentType(req.header("accept")) || "application/json";
      if (expectedTypes.indexOf(accept) === -1) {
        this.sendBadRequest(res, `Unsupported accept ${accept}, should be one of ${expectedTypes.join(",")}`);
        return;
      }

      res.setHeader("Content-type", accept);
      let xlsxData = null;
          
      switch (accept) {
        case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
          xlsxData = await this.getContractsAsXLSX([databaseContract]);
          res.setHeader("Content-disposition", `attachment; filename=${xlsxData.filename}`);
          res.status(200).send(xlsxData.buffer);
          break;
        default:
          res.status(200).send(await this.translateDatabaseContract(databaseContract));
          break;
      }
    }

    /**
     * @inheritdoc
     */
    async updateContract(req, res) {
      const contractId = req.params.id;
      if (!contractId) {
        this.sendNotFound(res);
        return;
      }

      const databaseContract = await this.models.findContractByExternalId(contractId);
      if (!databaseContract) {
        this.sendNotFound(res);
        return;
      }

      const canUpdateOthers = this.hasRealmRole(req, ApplicationRoles.UPDATE_OTHER_CONTRACTS);
      const loggedUserId = this.getLoggedUserId(req);
      if (loggedUserId !== databaseContract.userId && !canUpdateOthers) {
        this.sendForbidden(res, "You do not have permission to update this contract");
        return;
      }

      if (!canUpdateOthers && databaseContract.status !== "DRAFT") {
        this.sendForbidden(res, "You have no permission to update this contract" + databaseContract.status);
        return;
      }

      const updateContract = _.isObject(req.body) ? Contract.constructFromObject(req.body) : null;
      if (!updateContract) {
        this.sendBadRequest(res, "Failed to parse body");
        return;
      }

      if (!updateContract.itemGroupId) {
        this.sendBadRequest(res, "itemGroupId is required");
        return;
      }

      const deliveryPlace = await this.models.findDeliveryPlaceByExternalId(updateContract.deliveryPlaceId);
      const proposedDeliveryPlace = await this.models.findDeliveryPlaceByExternalId(updateContract.proposedDeliveryPlaceId || updateContract.deliveryPlaceId);
      const itemGroup = await this.models.findItemGroupByExternalId(updateContract.itemGroupId);

      if (!itemGroup) {
        this.sendBadRequest(res, "Invalid itemGroupId");
        return;
      }
      
      // May not be edited by users without UPDATE_OTHER_CONTRACTS -permission
      let year = updateContract.year;
      let deliveryPlaceId = deliveryPlace ? deliveryPlace.id : null;
      let itemGroupId = itemGroup.id;
      let sapId = updateContract.sapId;
      let contractQuantity = updateContract.contractQuantity;
      let deliveredQuantity = updateContract.deliveredQuantity;
      let startDate = updateContract.startDate;
      let endDate = updateContract.endDate;
      let signDate = updateContract.signDate;
      let termDate = updateContract.termDate;
      let remarks = updateContract.remarks;
 
      // May be edited by users that own the contract
      const proposedDeliveryPlaceId = proposedDeliveryPlace ? proposedDeliveryPlace.id : null;
      const proposedQuantity = updateContract.proposedQuantity;
      const areaDetails = updateContract.areaDetails;
      const deliverAll = updateContract.deliverAll;
      const deliveryPlaceComment = updateContract.deliveryPlaceComment;
      const quantityComment = updateContract.quantityComment;
      const rejectComment = updateContract.rejectComment;

      // Derived if the user does not have UPDATE_OTHER_CONTRACTS -permission
      let status = updateContract.status;

      if (!canUpdateOthers) {
        year = databaseContract.year;
        deliveryPlaceId = databaseContract.deliveryPlaceId;
        itemGroupId = databaseContract.itemGroupId;
        sapId = databaseContract.sapId;
        contractQuantity = databaseContract.contractQuantity;
        deliveredQuantity = databaseContract.deliveredQuantity;
        startDate = databaseContract.startDate;
        endDate = databaseContract.endDate;
        signDate = databaseContract.signDate;
        termDate = databaseContract.termDate;
        remarks = databaseContract.remarks;

        if (updateContract.status === "REJECTED") {
          status = "REJECTED";
        } else if (!updateContract.status || updateContract.status === "DRAFT" || updateContract.status === "ON_HOLD") {
          if (contractQuantity === proposedQuantity && deliveryPlaceId === proposedDeliveryPlaceId) {
            status = "DRAFT";
          } else {
            status = "ON_HOLD";
          }
        } else {
          this.sendForbidden(res, "You have no permission to update contract status");
          return;
        }
      }

      await this.models.updateContract(databaseContract.id,
        year,
        deliveryPlaceId,
        proposedDeliveryPlaceId,
        itemGroupId,
        sapId,
        contractQuantity, 
        deliveredQuantity,
        proposedQuantity,
        startDate, 
        endDate, 
        signDate, 
        termDate, 
        status, 
        areaDetails ? JSON.stringify(areaDetails) : null,
        deliverAll,
        remarks, 
        deliveryPlaceComment, 
        quantityComment, 
        rejectComment);

      const updatedDatabaseContract = await this.models.findContractById(databaseContract.id);
      if (!updatedDatabaseContract) {
        this.sendInternalServerError(res, "Failed to update contract");
        return; 
      }

      this.sendContractChangePushNotification(
        updatedDatabaseContract.userId,
        `Sopimus ${itemGroup.displayName || itemGroup.name} / ${year} päivittyi`,
        `Sopimus ${itemGroup.displayName || itemGroup.name} siirtyi tilaan ${this.getContractStatusDisplayName(updatedDatabaseContract.status)}`);

      res.status(200).send(await this.translateDatabaseContract(updatedDatabaseContract));
    }
    
    /**
     * @inheritdoc
     */
    async getContractDocument(req, res) {
      const contractId = req.params.id;
      const type = req.params.type;
      const format = req.query.format;
      
      if (!contractId || !type) {
        this.sendNotFound(res);
        return;
      }
      
      if (!format) {
        this.sendBadRequest(res, "Missing request parameter format");
        return;
      }
      
      const contract = await this.models.findContractByExternalId(contractId);
      if (!contract) {
        this.sendNotFound(res);
        return;
      }

      const loggedUserId = this.getLoggedUserId(req);
      if (loggedUserId !== contract.userId && !this.hasRealmRole(req, ApplicationRoles.LIST_ALL_CONTRACTS)) {
        this.sendForbidden(res, "You have no permission to find this contract");
        return;
      }

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      
      switch (format) {
        case "HTML":
          this.getContractDocumentHtml(baseUrl, contract, type)
            .then((document) => {
              if (!document) {
                this.sendNotFound(res);
              } else {
                res.setHeader("Content-type", "text/html");
                res.send(document.content);
              }
            })
            .catch((err) => {
              this.logger.error(`PDF Rendering failed on ${err}`);
              this.sendInternalServerError(res, err);
            });
          return;
        break;
        case "PDF":
          this.getContractDocumentPdf(baseUrl, contract, type)
            .then((document) => {
              if (!document) {
                this.sendNotFound(res);
              } else {
                res.setHeader("Content-type", "application/pdf");
                res.setHeader("Content-disposition", `attachment; filename=${document.filename}`);
                if (document.dataStream) {
                  document.dataStream.pipe(res);
                } else {
                  res.send(document.data);
                }
              }
            })
            .catch((err) => {
              this.logger.error(`PDF Rendering failed on ${err}`);
              this.sendInternalServerError(res, err);
            });
        break;
      }
      
    }
    
    /**
     * @inheritdoc
     */
    async createContractDocumentTemplate(req, res) {
      if (!this.hasRealmRole(req, ApplicationRoles.CREATE_CONTRACT_DOCUMENT_TEMPLATES)) {
        this.sendForbidden(res, "You have no permission to create contract document templates");
        return;
      }
      
      const contractId = req.params.contractId;
      if (!contractId) {
        this.sendNotFound(res);
        return;
      }
      
      const databaseContract = await this.models.findContractByExternalId(contractId);
      if (!databaseContract) {
        this.sendNotFound(res);
        return;
      }

      const payload = _.isObject(req.body) ? ContractDocumentTemplate.constructFromObject(req.body) : null;
      if (!payload) {
        this.sendBadRequest(res, "Failed to parse body");
        return;
      }

      const databaseDocumentTemplate = await this.models.createDocumentTemplate(payload.contents, payload.header, payload.footer);
      const databaseContractDocumentTemplate = await this.models.createContractDocumentTemplate(payload.type, databaseContract.id, databaseDocumentTemplate.id);

      res.status(200).send(this.translateContractDocumentTemplate(databaseContractDocumentTemplate, databaseContract, databaseDocumentTemplate));
    }

    /**
     * @inheritdoc
     */
    async findContractDocumentTemplate(req, res) {
      if (!this.hasRealmRole(req, ApplicationRoles.LIST_CONTRACT_DOCUMENT_TEMPLATES)) {
        this.sendForbidden(res, "You have no permission to list contract document templates");
        return;
      }
     
      const contractId = req.params.contractId;
      const contractDocumentTemplateId = req.params.contractDocumentTemplateId;
      if (!contractId || !contractDocumentTemplateId) {
        this.sendNotFound(res);
        return;
      }
      
      const databaseContractDocumentTemplate = await this.models.findContractDocumentTemplateByExternalId(contractDocumentTemplateId);
      if (!databaseContractDocumentTemplate) {
        this.sendNotFound(res);
        return;
      }

      const databaseContract = await this.models.findContractByExternalId(contractId);
      if (!databaseContract) {
        this.sendNotFound(res);
        return;
      }

      if (databaseContractDocumentTemplate.contractId !== databaseContract.id) {
        this.sendNotFound(res);
        return;
      }

      const databaseDocumentTemplate = await this.models.findDocumentTemplateById(databaseContractDocumentTemplate.documentTemplateId);
      if (!databaseDocumentTemplate) {
        this.sendNotFound(res);
        return;
      }

      res.status(200).send(this.translateContractDocumentTemplate(databaseContractDocumentTemplate, databaseContract, databaseDocumentTemplate));
    }

    /**
     * @inheritdoc
     */
    async listContractDocumentTemplates(req, res) {
      if (!this.hasRealmRole(req, ApplicationRoles.LIST_CONTRACT_DOCUMENT_TEMPLATES)) {
        this.sendForbidden(res, "You have no permission to list contract document templates");
        return;
      }
     
      const contractId = req.params.contractId;
      const type = req.query.type;
      if (!contractId) {
        this.sendNotFound(res);
        return;
      }

      const contract = await this.models.findContractByExternalId(contractId);
      if (!contract) {
        this.sendNotFound(res);
        return;
      }

      const databaseContractDocumentTemplates = this.listDatabaseContractDocumentTemplates(contract.id, type);
      const contractDocumentTemplates = await Promise.all(databaseContractDocumentTemplates.map((databaseContractDocumentTemplate) => {
        return this.models.findDocumentTemplateById(databaseContractDocumentTemplate.documentTemplateId)
          .then((databaseDocumentTemplate) => {
            return this.translateContractDocumentTemplate(databaseContractDocumentTemplate, contract, databaseDocumentTemplate);
          });
      }));

      res.status(200).send(contractDocumentTemplates);
    }
    
    /**
     * @inheritdoc
     */
    async updateContractDocumentTemplate(req, res) {
      if (!this.hasRealmRole(req, ApplicationRoles.UPDATE_CONTRACT_DOCUMENT_TEMPLATES)) {
        this.sendForbidden(res, "You have no permission to update contract document templates");
        return;
      }

      const contractId = req.params.contractId;
      const contractDocumentTemplateId = req.params.contractDocumentTemplateId;
      if (!contractId || !contractDocumentTemplateId) {
        this.sendNotFound(res);
        return;
      }
      
      const databaseContractDocumentTemplate = await this.models.findContractDocumentTemplateByExternalId(contractDocumentTemplateId);
      if (!databaseContractDocumentTemplate) {
        this.sendNotFound(res);
        return;
      }

      const databaseContract = await this.models.findContractByExternalId(contractId);
      if (!databaseContract) {
        this.sendNotFound(res);
        return;
      }

      if (databaseContractDocumentTemplate.contractId !== databaseContract.id) {
        this.sendNotFound(res);
        return;
      }

      const databaseDocumentTemplate = await this.models.findDocumentTemplateById(databaseContractDocumentTemplate.documentTemplateId);
      if (!databaseDocumentTemplate) {
        this.sendNotFound(res);
        return;
      }

      const payload = _.isObject(req.body) ? ContractDocumentTemplate.constructFromObject(req.body) : null;
      if (!payload) {
        this.sendBadRequest(res, "Failed to parse body");
        return;
      }

      await this.models.updateDocumentTemplate(databaseDocumentTemplate.id, payload.contents, payload.header, payload.footer);

      const updatedDocumentTemplate = await this.models.findDocumentTemplateById(databaseContractDocumentTemplate.documentTemplateId);
      if (!updatedDocumentTemplate) {
        this.sendInternalServerError(res, "Failed to update document template");
        return;
      }
      
      res.status(200).send(this.translateContractDocumentTemplate(databaseContractDocumentTemplate, databaseContract, updatedDocumentTemplate));
    }
    
    /**
     * @inheritdoc
     */
    async listContractPrices(req, res) {
      const contractId = req.params.contractId;
      const sortBy = req.query.sortBy;
      const sortDir = req.query.sortDir;
      const firstResult = parseInt(req.query.firstResult) || 0;
      const maxResults = parseInt(req.query.maxResults) || 5;

      if (!contractId) {
        this.sendNotFound(res);
        return;
      }

      const databaseContract = await this.models.findContractByExternalId(contractId);
      if (!databaseContract) {
        this.sendNotFound(res);
        return;
      }

      const loggedUserId = this.getLoggedUserId(req);
      if (loggedUserId !== databaseContract.userId && !this.hasRealmRole(req, ApplicationRoles.LIST_ALL_CONTRACTS)) {
        this.sendForbidden(res, "You have no permission to list this contracts prices");
        return;
      }

      const databaseItemGroup = await this.models.findItemGroupById(databaseContract.itemGroupId);
      if (!databaseItemGroup) {
        this.sendInternalServerError(res, "Database item group not found");
        return;
      }

      const orderBy = sortBy === "YEAR" ? "year" : null;
      const prices = await this.models.listItemGroupPrices(databaseItemGroup.id, null, firstResult, maxResults, orderBy, sortDir);

      res.status(200).send(prices.map((price) => {
        return this.translateItemGroupPrice(price, databaseItemGroup);
      }));
    }
    
    /**
     * @inheritdoc
     */
    async listContracts(req, res) {
      const listAll = req.query.listAll === "true";
      const itemGroupCategory = req.query.itemGroupCategory;
      const itemGroupExternalId = req.query.itemGroupId;
      const year = req.query.year;
      const status = req.query.status;
      const firstResult = parseInt(req.query.firstResult) || 0;
      const maxResults = parseInt(req.query.maxResults) || 5;

      if (listAll && !this.hasRealmRole(req, ApplicationRoles.LIST_ALL_CONTRACTS)) {
        this.sendForbidden(res, "You have no permission to list this contracts prices");
        return;
      }

      const databaseItemGrouplId = itemGroupExternalId ? (await this.models.findItemGroupByExternalId(itemGroupExternalId)) : null;
      const itemGroupId = databaseItemGrouplId ? databaseItemGrouplId.id : null;
      const userId = listAll ? null : this.getLoggedUserId(req);
      const databaseContracts = await this.models.listContracts(userId, itemGroupCategory, itemGroupId, year, status, firstResult, maxResults);

      if (!userId && !listAll) {
        this.sendInternalServerError(res, "listAll not set but userId resolved to null");
        return;
      }

      const expectedTypes = ["application/json", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
      const accept = this.getBareContentType(req.header("accept")) || "application/json";
      if (expectedTypes.indexOf(accept) === -1) {
        this.sendBadRequest(res, `Unsupported accept ${accept}, should be one of ${expectedTypes.join(",")}`);
        return;
      }

      res.setHeader("Content-type", accept);
      let xlsxData = null;
          
      switch (accept) {
        case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
          xlsxData = await this.getContractsAsXLSX(databaseContracts);
          res.setHeader("Content-disposition", `attachment; filename=${xlsxData.filename}`);
          res.status(200).send(xlsxData.buffer);
          break;
        default:
          const count = await this.models.countContracts(userId, itemGroupCategory, itemGroupId, year, status);
          res.header("Total-Count", count);
          res.status(200).send(await Promise.all(databaseContracts.map((databaseContract) => {
            return this.translateDatabaseContract(databaseContract);
          })));
          break;
      }
    }
    
    /**
     * @inheritdoc
     */
    async createContractDocumentSignRequest(req, res) {
      const contractId = req.params.id;
      const type = req.params.type;
      const ssn = req.query.ssn;
      const authService = req.query.authService;
      
      if (!contractId || !type) {
        this.sendNotFound(res);
        return;
      }
      
      const contract = await this.models.findContractByExternalId(contractId);
      if (!contract) {
        this.sendNotFound(res);
        return;
      }

      const userId = contract.userId;
      const loggedUserId = this.getLoggedUserId(req);

      if (userId !== loggedUserId) {
        this.sendForbidden(res, "You cannot sign this contract");
        return;
      }
      
      if (!contract.deliveryPlaceId || contract.deliveryPlaceId !== contract.proposedDeliveryPlaceId) {
        this.sendBadRequest(res, "This contract is not ready for signing");
        return;
      }
      
      if (!contract.contractQuantity || contract.contractQuantity !== contract.proposedQuantity) {
        this.sendBadRequest(res, "This contract is not ready for signing");
        return;
      }

      if (contract.status !== "DRAFT") {
        this.sendBadRequest(res, `This contract is not ready for signing (status ${contract.status})`);
        return;
      }

      const itemGroup = await this.models.findItemGroupById(contract.itemGroupId);
      if (!itemGroup) {
        this.sendNotFound(res);
        return;
      }

      if (itemGroup.prerequisiteContractItemGroupId) {
        const prerequisiteContracts = await this.models.listContracts(userId, null, itemGroup.prerequisiteContractItemGroupId, contract.year, "APPROVED", 0, 1);
        if (!prerequisiteContracts || prerequisiteContracts.length < 1) {
          this.sendBadRequest(res, "Missing prerequisite contracts");
          return;
        }
      }
      
      const document = await this.getContractDocumentPdf(`${req.protocol}://${req.get("host")}`, contract, type);
      if (!document) {
        this.sendNotFound(res);
        return;
      }
      
      const parts = await toArray(document.dataStream);
      const buffers = parts.map(part => Buffer.isBuffer(part) ? part : Buffer.from(part));
      const fileBuffer = Buffer.concat(buffers);
      const existingContractDocument = await this.models.findContractDocumentByContractAndType(contract.id, type);

      if (config.get("mode") === "TEST") {
        // TODO: It's currently not possible to test sign service because
        // VismaSign does not provide  test account
        res.send(ContractDocumentSignRequest.constructFromObject({redirectUrl: "about:testmode" }));
        return;
      }

      if (existingContractDocument != null) {
        if (existingContractDocument.signed) {
          this.sendBadRequest(res, "Contract document is already signed");
          return;
        } else {
          await this.signature.cancelDocument(existingContractDocument.vismaSignDocumentId);
          await this.signature.deleteDocument(existingContractDocument.vismaSignDocumentId);
          await this.models.deleteContractDocument(existingContractDocument.id);
        }
      }

      const vismaSignDocumentId = await this.signature.createDocument(document.documentName);
      const contractDocument = await this.models.createContractDocument(type, contract.id, vismaSignDocumentId);
      const invitation = await this.signature.requestSignature(vismaSignDocumentId, document.filename, fileBuffer);
      const appUrl = `${req.protocol}://${req.get("host")}`;      
      const returnUrl = `${appUrl}/signcallback?type=contract-document&contractId=${contractId}&type=${type}`;
      const fulfillResult = await this.signature.fullfillInvitation(invitation.uuid, returnUrl, ssn, authService);
      
      this.tasks.enqueueContractDocumentStatusTask(contractDocument.id);
      res.send(ContractDocumentSignRequest.constructFromObject({redirectUrl: fulfillResult.location }));
    }
    
    /**
     * Translates Database contract into REST entity
     * 
     * @param {Object} contract Sequelize contract model
     * @return {Contract} REST entity
     */
    async translateDatabaseContract(contract) {
      const itemGroup = await this.models.findItemGroupById(contract.itemGroupId);
      const deliveryPlace = await this.models.findDeliveryPlaceById(contract.deliveryPlaceId);
      const proposedDeliveryPlace = await this.models.findDeliveryPlaceById(contract.proposedDeliveryPlaceId);
      const areaDetails = contract.areaDetails ? JSON.parse(contract.areaDetails).map((areaDetail) => {
        return AreaDetail.constructFromObject(areaDetail);
      }) : [];  

      return Contract.constructFromObject({
        "id": contract.externalId,
        "sapId": contract.sapId,
        "contactId": contract.userId,
        "itemGroupId": itemGroup.externalId,
        "deliveryPlaceId": deliveryPlace.externalId,
        "proposedDeliveryPlaceId": proposedDeliveryPlace.externalId,
        "contractQuantity": contract.contractQuantity,
        "deliveredQuantity": contract.deliveredQuantity,
        "proposedQuantity": contract.proposedQuantity,
        "startDate": contract.startDate,
        "endDate": contract.endDate,
        "signDate": contract.signDate,
        "termDate": contract.termDate,
        "status": contract.status,
        "areaDetails": areaDetails || [],
        "deliverAll": contract.deliverAll,
        "remarks": contract.remarks,
        "year": contract.year,
        "deliveryPlaceComment": contract.deliveryPlaceComment,
        "quantityComment": contract.quantityComment,
        "rejectComment": contract.rejectComment
      });
      
    }

    /**
     * Translates Database ContractDocumentTemplate into REST entity
     * 
     * @param {*} databaseContractDocumentTemplate Sequelize contract document template
     * @param {*} databaseContract Sequelize contract model
     * @param {*} databaseDocumentTemplate Sequelize document template
     */
    translateContractDocumentTemplate(databaseContractDocumentTemplate, databaseContract, databaseDocumentTemplate) {
      return ContractDocumentTemplate.constructFromObject({
        "id": databaseContractDocumentTemplate.externalId,
        "contractId": databaseContract.externalId,
        "type": databaseContractDocumentTemplate.type,
        "contents": databaseDocumentTemplate.contents,
        "header": databaseDocumentTemplate.header,
        "footer": databaseDocumentTemplate.footer
      });
    }

    /**
     * Translates Database ItemGroupPrice into REST entity
     * 
     * @param {ItemGroupPrice} databasePrice Sequelize item group price
     * @param {ItemGroup} itemGroup Sequelize item group
     */
    translateItemGroupPrice(databasePrice, itemGroup) {
      return Price.constructFromObject({
        "id": databasePrice.externalId,
        "group": databasePrice.groupName,
        "unit": databasePrice.unit,
        "price": databasePrice.price,
        "year": databasePrice.year,
        "itemGroupId": itemGroup.externalId
      });
    }

    /**
     * Exports array contracts as XLSX 
     * 
     * @param {Contract[]} contracts array of contracts
     * @returns {Object} object containing exported data buffer, filename and sheet name
     */
    async getContractsAsXLSX(contracts) {
      const name = "export";
      const filename =`${slugify(name)}.xlsx`;

      const columnHeaders = [
        i18n.__("contracts.exports.supplierId"),
        i18n.__("contracts.exports.companyName"),
        i18n.__("contracts.exports.itemGroupName"),
        i18n.__("contracts.exports.contractQuantity"),
        i18n.__("contracts.exports.placeName"),
        i18n.__("contracts.exports.remarks"),
        i18n.__("contracts.exports.signDate"),
        i18n.__("contracts.exports.approvalDate")
      ];

      const rows = await this.getContractXLSXRows(contracts);

      return {
        name: name,
        filename: filename,
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        buffer: this.xlsx.buildXLSX(name, columnHeaders, rows) 
      };
    }

    /**
     * Returns contract datas as Excel rows 
     * 
     * @param {Contract[]} contracts array of contract objects
     * @returns {Promise} promise for XLSX rows
     */
    getContractXLSXRows(contracts) {
      return Promise.all(contracts.map((contract) => {
        return this.getContractXLSXRow(contract);
      }));
    }

    /**
     * Returns contract data as Excel row 
     * 
     * @param {Contract} contract contract object 
     * @returns {Promise} promise for XLSX row
     */
    async getContractXLSXRow(contract) {
      const user = await this.userManagement.findUser(contract.userId);
      const deliveryPlace = await this.models.findDeliveryPlaceById(contract.deliveryPlaceId);
      const itemGroup = await this.models.findItemGroupById(contract.itemGroupId);

      const supplierId = this.userManagement.getSingleAttribute(user, this.userManagement.ATTRIBUTE_SAP_ID);
      const companyName = this.userManagement.getSingleAttribute(user, this.userManagement.ATTRIBUTE_COMPANY_NAME);
      const itemGroupName = itemGroup ? itemGroup.name : null;
      const contractQuantity = contract.contractQuantity;
      const placeName = deliveryPlace ? deliveryPlace.name : null;
      const remarks = contract.remarks;
      const signDate = contract.signDate;
      const approvalDate = contract.termDate;

      return [
        supplierId,
        companyName,
        itemGroupName,
        contractQuantity,
        placeName,
        remarks,
        signDate,
        approvalDate
      ];
    }
    
    /**
     * Renders contract document as HTML
     * 
     * @param {String} baseUrl baseUrl
     * @param {Contract} contract contract
     * @param {String} type document type 
     */
    async getContractDocumentHtml(baseUrl, contract, type) {
      const contractDocumentTemplate = await this.models.findContractDocumentTemplateByTypeAndContractId(type, contract.id);
      const itemGroupDocumentTemplate = !contractDocumentTemplate ? await this.models.findItemGroupDocumentTemplateByTypeAndItemGroupId(type, contract.itemGroupId) : null;
      if (!contractDocumentTemplate && !itemGroupDocumentTemplate) {
        return null;
      }
      
      const documentTemplateId = contractDocumentTemplate ? contractDocumentTemplate.documentTemplateId : itemGroupDocumentTemplate.documentTemplateId;
      
      const documentTemplate = await this.models.findDocumentTemplateById(documentTemplateId);
      if (!documentTemplate) {
        return null;
      }
      
      const user = await this.userManagement.findUser(contract.userId);
      if (!user) {
        return null;
      }
      
      const year = (new Date()).getFullYear();
      const companyName = this.userManagement.getSingleAttribute(user, this.userManagement.ATTRIBUTE_COMPANY_NAME);
      const taxCode = this.userManagement.getSingleAttribute(user, this.userManagement.ATTRIBUTE_TAX_CODE);
      const prices = await this.models.listItemGroupPrices(contract.itemGroupId, year, 0, 1000, null, null);
      const deliveryPlace = contract.deliveryPlaceId ? await this.models.findDeliveryPlaceById(contract.deliveryPlaceId) : null;
      const businessCode = this.getBusinessCode(taxCode);
      
      const templateData = {
        companyName: companyName,
        contract: contract,
        prices: prices,
        deliveryPlace: deliveryPlace ? deliveryPlace.name : null,
        areaDetails: contract.areaDetails ? JSON.parse(contract.areaDetails) : [],
        contractStartDate: this.formatDate(contract.startDate),
        contractEndDate: this.formatDate(contract.endDate),
        contractSignDate: this.formatDate(contract.signDate),
        contractTermDate: this.formatDate(contract.termDate),
        businessCode: businessCode,
        taxCode: taxCode
      };
      
      const content = await this.renderDocumentTemplateComponent(baseUrl, documentTemplate.contents, "contract-document.pug", templateData);
      if (!content) {
        return null;
      }
      
      const header = await this.renderDocumentTemplateComponent(baseUrl, documentTemplate.header, "contract-header.pug", templateData);
      const footer = await this.renderDocumentTemplateComponent(baseUrl, documentTemplate.footer, "contract-footer.pug", templateData);
      const itemGroup = await this.models.findItemGroupById(contract.itemGroupId);
      const documentName = this.getDocumentName(itemGroup, companyName);
      const documentSlug = this.getDocumentSlug(documentName);

      return { 
        documentName: documentName, 
        fileName: `${documentSlug}.html`, 
        content: content, 
        header: header, 
        footer: footer
      };    
    }

    /**
     * Renders contract document as HTML
     * 
     * @param {String} baseUrl baseUrl
     * @param {Contract} contract contract
     * @param {String} type document type 
     */
    async getContractDocumentPdf(baseUrl, contract, type) {
      const contractDocument = await this.models.findContractDocumentByContractAndType(contract.id, type);
      if (contractDocument && contractDocument.vismaSignDocumentId) {
        const documentFile = await this.signature.getDocumentFile(contractDocument.vismaSignDocumentId);
        if (documentFile) {
          const itemGroup = await this.models.findItemGroupById(contract.itemGroupId);
          const companyName = await this.getContractCompanyName(contract);
          const documentName = this.getDocumentName(itemGroup, companyName);
          const documentSlug = this.getDocumentSlug(documentName);

          return { 
            documentName: documentName, 
            fileName: `${documentSlug}.pdf`, 
            data: documentFile
          };  
        }
      }

      const contractDocumentHtml = await this.getContractDocumentHtml(baseUrl, contract, type);

      return { 
        documentName: contractDocumentHtml.documentName, 
        fileName: `${contractDocumentHtml.documentSlug}.pdf`, 
        dataStream: await this.pdf.renderPdf(contractDocumentHtml.content, contractDocumentHtml.header, contractDocumentHtml.footer, baseUrl) 
      };    
    }

    /**
     * Lists contract document templates.
     * 
     * @param {int} contractId contract id
     * @param {String} type template type. Optional, ignored if null
     * @returns {Object[]} array of Sequelize contract document templates
     */
    listDatabaseContractDocumentTemplates(contractId, type) {
      if (type) {
        return this.models.findContractDocumentTemplateByTypeAndContractId(type, contractId)
          .then((contractDocumentTemplate) => {
            if (contractDocumentTemplate) {
              return [contractDocumentTemplate];
            } else {
              return [];
            }
          }); 
      } else {
        return this.models.listContractDocumentTemplateByContractId(contractId);
      }
    }

    /**
     * Returns content type without parameters
     */
    getBareContentType(contentType) {
      if (!contentType) {
        return null;
      }

      return contentType.split(";")[0].trim();
    }

    /**
     * Returns company name for a contract
     * 
     * @param {Contract} contract contract 
     */
    async getContractCompanyName(contract) {
      const user = await this.userManagement.findUser(contract.userId);
      if (!user) {
        return null;
      }

      return this.userManagement.getSingleAttribute(user, this.userManagement.ATTRIBUTE_COMPANY_NAME);
    }

    /**
     * Returns contract document's name for a item group and company
     * 
     * @param {ItemGroup} itemGroup item group 
     * @param {String} companyName company name 
     */
    getDocumentName(itemGroup, companyName) {
      return `${moment().format("YYYY")} - ${itemGroup.name}, ${companyName}`;
    }

    /**
     * Slugifys document name 
     * 
     * @param {*} documentName 
     */
    getDocumentSlug(documentName) {
      return slugify(documentName);
    }

    /**
     * Formats given date as finnish format
     * 
     * @param {Date} date 
     * @returns {String} given date as finnish format
     */
    formatDate(date) {
      if (!date) {
        return "";
      }

      return moment(date).locale("fi").format("L");
    }

    /**
     * Formats federal tax id as business code
     * 
     * @param {String} federalTaxId tax id
     * @returns {String} business code
     */
    getBusinessCode(federalTaxId) {
      if (federalTaxId && federalTaxId.toUpperCase().startsWith("FI")) {
        let result = federalTaxId.substring(2);
        if (result.length === 8) {
          return `${result.substring(0, 7)}-${result.substring(7)}`;
        }
      }

      return "";
    }

    /**
     * Renders a document template component into HTML text
     * 
     * @param {String} baseurl base url
     * @param {String} mustacheTemplate mustache template
     * @param {String} pugTemplateName pug template name
     * @param {Object} mustacheData data passed to Mustache renderer
     * @return {String} rendered HTML
     */
    async renderDocumentTemplateComponent(baseUrl, mustacheTemplate, pugTemplateName, mustacheData) {
      if (!mustacheTemplate) {
        return null;
      }

      const mustachePartials = await this.loadMustachePartials();
      const preprosessedMustacheTemplate = await this.preprosessMustacheTemplate(mustacheTemplate);

      const bodyContent = Mustache.render(preprosessedMustacheTemplate, 
        mustacheData,
        mustachePartials
      );

      return this.renderPugTemplate(pugTemplateName, {
        bodyContent: bodyContent,
        baseUrl: baseUrl
      });
    }

    async loadMustachePartials() {
      const result = {};
      const partialFiles = await this.getMustachePartialFiles();
      const partials = await Promise.all(partialFiles.map((partialFile) => {
        return this.loadMustachePartial(partialFile);
      }));

      partialFiles.forEach((partialFile, index) => {
        const partialName = path.basename(partialFile, ".mustache");
        result[partialName] = partials[index];
      });

      return result;
    }

    loadMustachePartial(file) {
      return new Promise((resolve, reject) => {
        fs.readFile(file, (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data.toString());
          }
        });  
      });  
    }

    getMustachePartialFiles() {
      const folder = `${__dirname}/../../../mustache/`;

      return new Promise((resolve, reject) => {
        fs.readdir(folder, (err, files) => {
          if (err) {
            reject(err);
          } else {
            resolve(files.map((file) => {
              return `${folder}/${file}`;
            }));
          }
        });
      });
    }

    /**
     * Preprosesses mustache template.
     * 
     * @param {String} template mustache template 
     */
    async preprosessMustacheTemplate(template) {
      const partials = (await this.getMustachePartialFiles()).map((partialFile) => {
        return path.basename(partialFile, ".mustache");
      });

      partials.forEach((partial) => {
        template = template.replace(new RegExp("[{]{2,3}[\\s]{0,}" + partial + "[\\s]{0,}[}]{2,3}", "gi"), `{{ > ${partial} }}`);
      });

      return template;
    }
    
    /**
     * Renders a pug template
     * 
     * @param {String} template template name
     * @param {Object} model model
     * @return {String} rendered HTML
     */
    renderPugTemplate(template, model) {
      const compiledPug = pug.compileFile(`${__dirname}/../../../templates/${template}`);
      return compiledPug(model);
    }

    /**
     * Gets display name for contract status
     * 
     * @param {String} status contract status saved in database
     * @returns {String} display name for each contract status
     */
    getContractStatusDisplayName(status) {
      switch (status) {
        case "APPROVED":
          return "hyväksytty";
        case "ON_HOLD":
          return "Pakkasmarjan tarkastettavana";
        case "DRAFT":
          return "ehdotus";
        case "TERMINATED":
          return "päättynyt";
        case "REJECTED":
          return "hylätty";
        default:
          return "muu";
      }
    }
    
    /**
     * Sends push notification to user about contract status change
     * 
     * @param {String} userId userId
     * @param {String} title push notification title
     * @param {String} content push notification content
     */
    sendContractChangePushNotification(userId, title, content) {
      this.models.findUserSettingsByUserIdAndKey(userId, "contract-push-notifications")
        .then((userSetting) => {
          if (!userSetting) {
            this.pushNotifications.sendPushNotification(userId, title, content, true);
          } else {
            if (userSetting.settingValue !== "disabled") {
              this.pushNotifications.sendPushNotification(userId, title, content, userSetting.settingValue !== "silent");
            }
          }
        });
    }

  }

  module.exports = ContractsServiceImpl;

})();

