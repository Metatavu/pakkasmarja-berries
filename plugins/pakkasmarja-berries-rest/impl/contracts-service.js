/*jshint esversion: 6 */
/* global __dirname */

(() => {
  "use strict";

  const Promise = require("bluebird");
  const Mustache = require("mustache");
  const pug = require("pug");
  const AbstractContractsService = require(`${__dirname}/../service/contracts-service`);
  const Contract = require(`${__dirname}/../model/contract`);
  const ContractDocumentSignRequest = require(`${__dirname}/../model/contract-document-sign-request`);
  const toArray = require("stream-to-array");
  const slugify = require("slugify");
  const moment = require("moment");
  const i18n = require("i18n");
  const stream = require('stream');

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
    
    async findContract(req, res) {
      const contractId = req.params.id;
      if (!contractId) {
        this.sendNotFound(res);
        return;
      }
      
      const databaseContract = await this.models.findContractByExternalId(contractId);
      if (!databaseContract) {
        this.sendNotFound(res);
        return;
      }

      const expectedTypes = ["application/json", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
      const accept = req.header("accept") || "application/json";
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
    /* jshint ignore:start */
    async getContractDocument(req, res) {
      const contractId = req.params.id;
      const type = req.params.type;
      const format = req.query.format;
      
      if (!contractId || !type) {
        this.sendNotFound(res);
        return;
      }
      
      if (!format) {
        this.sendBadRequest(res, "Missing request parameter format");
        return;
      }
      
      const contract = await this.models.findContractByExternalId(contractId);
      if (!contract) {
        this.sendNotFound(res);
        return;
      }
      
      switch (format) {
        case "HTML":
          this.sendNotImplemented(res);
          return;
        break;
        case "PDF":
          this.getContractDocumentPdf(`${req.protocol}://${req.get("host")}`, contract, type)
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
    /* jshint ignore:end */
    
    /**
     * Renders a document template component into HTML text
     * 
     * @param {String} baseurl base url
     * @param {String} mustacheTemplate mustache template
     * @param {String} pugTemplateName pug template name
     * @param {Object} mustacheData data passed to Mustache renderer
     * @return {String} rendered HTML
     */
    renderDocumentTemplateComponent(baseUrl, mustacheTemplate, pugTemplateName, mustacheData) {
      if (!mustacheTemplate) {
        return null;
      }
      
      return this.renderPugTemplate(pugTemplateName, {
        bodyContent: Mustache.render(mustacheTemplate, mustacheData),
        baseUrl: baseUrl
      });
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
      const databaseContracts = await this.models.listContracts();

      const expectedTypes = ["application/json", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
      const accept = req.header("accept") || "application/json";
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
      
      if (!contractId || !type) {
        this.sendNotFound(res);
        return;
      }
      
      const contract = await this.models.findContractByExternalId(contractId);
      if (!contract) {
        this.sendNotFound(res);
        return;
      }
      
      const document = await this.getContractDocumentPdf(`${req.protocol}://${req.get("host")}`, contract, type);
      if (!document) {
        this.sendNotFound(res);
      } else {
        const parts = await toArray(document.dataStream);
        const buffers = parts.map(part => Buffer.isBuffer(part) ? part : Buffer.from(part));
        const fileBuffer = Buffer.concat(buffers);
        
        const vismaSignDocumentId = await this.signature.createDocument(document.documentName);
        const redirectUrl = await this.signature.requestSignature(vismaSignDocumentId, document.filename, fileBuffer);
        const contractDocument = await this.models.createContractDocument(type, contract.id, vismaSignDocumentId);
        this.tasks.enqueueContractDocumentStatusTask(contractDocument.id);
        res.send(ContractDocumentSignRequest.constructFromObject({redirectUrl: redirectUrl}));
      }
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
      
      return Contract.constructFromObject({
        "id": contract.externalId,
        "contactId": contract.userId,
        "itemGroupId": itemGroup.externalId,
        "deliveryPlaceId": deliveryPlace.externalId,
        "quantity": contract.quantity,
        "startDate": contract.startDate,
        "endDate": contract.endDate,
        "signDate": contract.signDate,
        "termDate": contract.termDate,
        "status": contract.status,
        "remarks": contract.remarks
      });
      
    }

    /**
     * Exports array contracts as XLSX 
     * 
     * @param {Contract[]} contracts array of contracts
     * @returns {Object} object containing exported data buffer, filename and sheet name
     */
    async getContractsAsXLSX(contracts) {
      const name = 'export';
      const filename =`${slugify(name)}.xlsx`;

      const columnHeaders = [
        i18n.__("contracts.exports.supplierId"),
        i18n.__("contracts.exports.companyName"),
        i18n.__("contracts.exports.itemGroupName"),
        i18n.__("contracts.exports.quantity"),
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
      }
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
      const quantity = contract.quantity;
      const placeName = deliveryPlace ? deliveryPlace.name : null;
      const remarks = contract.remarks;
      const signDate = contract.signDate;
      const approvalDate = contract.termDate;

      return [
        supplierId,
        companyName,
        itemGroupName,
        quantity,
        placeName,
        remarks,
        signDate,
        approvalDate
      ];
    }
    
    async getContractDocumentPdf(baseUrl, contract, type) {
      const contractDocumentTemplate = await this.models.findContractDocumentTemplateByTypeAndContractId(type, contract.id);
      const itemGroupDocumentTemplate = !contractDocumentTemplate ? await this.models.findItemGroupDocumentTemplateByTypeAndItemGroupId(type, contract.itemGroupId) : null;
      if (!contractDocumentTemplate && !itemGroupDocumentTemplate) {
        return null;
      }
      
      const documentTemplateId = contractDocumentTemplate ? contractDocumentTemplate.documentTemplateId : itemGroupDocumentTemplate.documentTemplateId;
      
      const documentTemplate = await this.models.findDocumentTemplateById(documentTemplateId);
      if (!documentTemplate) {
        return null;
      }
      
      const user = await this.userManagement.findUser(contract.userId);
      if (!user) {
        return null;
      }
      
      const companyName = this.userManagement.getSingleAttribute(user, this.userManagement.ATTRIBUTE_COMPANY_NAME);
      
      const templateData = {
        companyName: companyName
      };
      
      const html = this.renderDocumentTemplateComponent(baseUrl, documentTemplate.contents, "contract-document.pug", templateData);
      if (!html) {
        return null;
      }
      
      const header = this.renderDocumentTemplateComponent(baseUrl, documentTemplate.header, "contract-header.pug", templateData);
      const footer = this.renderDocumentTemplateComponent(baseUrl, documentTemplate.footer, "contract-footer.pug", templateData);
      
      const itemGroup = await this.models.findItemGroupById(contract.itemGroupId);
      const documentName = `${moment().format("YYYY")} - ${itemGroup.name}, ${companyName}`;
      const filename =`${slugify(documentName)}.pdf`;
      
      return { documentName:documentName, filename: filename, dataStream: await this.pdf.renderPdf(html, header, footer, baseUrl) };      
    }
  }

  module.exports = ContractsServiceImpl;

})();

