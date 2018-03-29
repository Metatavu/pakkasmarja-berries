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
  const AbstractContractsService = require(`${__dirname}/../service/contracts-service`);
  const Contract = require(`${__dirname}/../model/contract`);
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
    constructor (logger, models, userManagement, pdf, xlsx, signature, tasks) {
      super();
      
      this.logger = logger;
      this.models = models;
      this.userManagement = userManagement;
      this.pdf = pdf;
      this.xlsx = xlsx;
      this.signature = signature;
      this.tasks = tasks;
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
      
      const deliveryPlaceId = deliveryPlace ? deliveryPlace.id : null;
      const proposedDeliveryPlaceId = proposedDeliveryPlace ? proposedDeliveryPlace.id : null;
      const itemGroupId = itemGroup.id;
      const contractQuantity = updateContract.contractQuantity;
      const deliveredQuantity = updateContract.deliveredQuantity;
      const proposedQuantity = updateContract.proposedQuantity;
      const startDate = updateContract.startDate;
      const endDate = updateContract.endDate;
      const signDate = updateContract.signDate;
      const termDate = updateContract.termDate;
      const status = updateContract.status;
      const remarks = updateContract.remarks;
      const year = updateContract.year;
      const deliveryPlaceComment = updateContract.deliveryPlaceComment;
      const quantityComment = updateContract.quantityComment;
      const rejectComment = updateContract.rejectComment;

      await this.models.updateContract(databaseContract.id,
        year,
        deliveryPlaceId,
        proposedDeliveryPlaceId,
        itemGroupId, 
        contractQuantity, 
        deliveredQuantity,
        proposedQuantity,
        startDate, 
        endDate, 
        signDate, 
        termDate, 
        status, 
        remarks, 
        deliveryPlaceComment, 
        quantityComment, 
        rejectComment);

      const updatedDatabaseContract = await this.models.findContractById(databaseContract.id);
      if (!updatedDatabaseContract) {
        this.sendInternalServerError(res, "Failed to update contract");
        return; 
      }

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
                const pdfStream = document.dataStream;
                res.setHeader("Content-type", "application/pdf");
                res.setHeader("Content-disposition", `attachment; filename=${document.filename}`);
                pdfStream.pipe(res);
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
      
      if (listAll && !this.hasRealmRole(req, "list-all-contracts")) {
        this.sendForbidden(res, "You have no permission to list all contracts");
        return;
      }

      const databaseItemGrouplId = itemGroupExternalId ? (await this.models.findItemGroupByExternalId(itemGroupExternalId)) : null;
      const itemGroupId = databaseItemGrouplId ? databaseItemGrouplId.id : null;
      const userId = listAll ? null : this.getLoggedUserId(req);
      const databaseContracts = await this.models.listContracts(userId, itemGroupCategory, itemGroupId, year, status, firstResult, maxResults);

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
      // TODO: Contract check status!
      
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
      
      const document = await this.getContractDocumentPdf(`${req.protocol}://${req.get("host")}`, contract, type);
      if (!document) {
        this.sendNotFound(res);
        return;
      } 
      
      const parts = await toArray(document.dataStream);
      const buffers = parts.map(part => Buffer.isBuffer(part) ? part : Buffer.from(part));
      const fileBuffer = Buffer.concat(buffers);
      const existingContractDocument = await this.models.findContractDocumentByContractAndType(contract.id, type);

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

      return Contract.constructFromObject({
        "id": contract.externalId,
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
      const prices = await this.models.listItemGroupPrices(contract.itemGroupId, year, null, null, null, null);
      
      const templateData = {
        companyName: companyName,
        prices: prices
      };
      
      const content = await this.renderDocumentTemplateComponent(baseUrl, documentTemplate.contents, "contract-document.pug", templateData);
      if (!content) {
        return null;
      }
      
      const header = await this.renderDocumentTemplateComponent(baseUrl, documentTemplate.header, "contract-header.pug", templateData);
      const footer = await this.renderDocumentTemplateComponent(baseUrl, documentTemplate.footer, "contract-footer.pug", templateData);
      const itemGroup = await this.models.findItemGroupById(contract.itemGroupId);
      const documentName = `${moment().format("YYYY")} - ${itemGroup.name}, ${companyName}`;
      const documentSlug = `${slugify(documentName)}.html`;

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
  }

  module.exports = ContractsServiceImpl;

})();

