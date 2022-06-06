import * as _ from "lodash";
import * as Keycloak from "keycloak-connect";
import * as path from "path";
import * as fs from "fs";
import * as i18n from "i18n";
import { Response, Request, Application } from "express";
import ContractsService from "../api/contracts.service";
import ApplicationRoles from "../application-roles";
import models, { ContractModel, ItemGroupModel, ContractDocumentTemplateModel, DocumentTemplateModel, ItemGroupPriceModel, DeliveryPlaceModel } from "../../models";
import { getLogger, Logger } from "log4js";
import { ContractDocumentTemplate, Contract, ContractDocumentSignRequest, AreaDetail, ItemGroupPrice, ContractStatus, ContractPreviewData, ImportedContractOpt, ContractOpt } from "../model/models";
import * as toArray from "stream-to-array";
import * as pug from "pug";
import * as Mustache from "mustache";
import * as moment from "moment";
import slugify from "slugify";
import { Stream } from "stream";
import userManagement, { UserProperty } from "../../user-management";
import pushNotifications from "../../push-notifications";
import signature from "../../signature";
import excel from "../../excel";
import pdf from "../../pdf";
import { config } from "../../config";
import xlsx from "node-xlsx";
import { createStackedReject } from "../../utils";
import ErpClient from "../../erp/client";
import { HttpError, SapContractStatus } from "../../generated/erp-services-client/api";

/**
 * Implementation for Contracts REST service
 */
interface HtmlContractDocumentData {
  documentName: string,
  documentSlug?: string,
  filename: string,
  content: string,
  header: string | null,
  footer: string | null
}

interface PdfContractDocument {
  documentName: string,
  filename: string,
  data?: File,
  dataStream?: Stream
}

export default class ContractsServiceImpl extends ContractsService {

  private logger: Logger;

  /**
   * Constructor
   *
   * @param app Express app
   * @param keycloak Keycloak
   */
  constructor(app: Application, keycloak: Keycloak) {
    super(app, keycloak);
    this.logger = getLogger();
  }

  /**
   * @inheritdoc
   */
  async createContract(req: Request, res: Response) {
    if (!this.hasRealmRole(req, ApplicationRoles.CREATE_CONTRACT)) {
      this.sendForbidden(res, "You have no permission to create contracts");
      return;
    }

    const contract: Contract = _.isObject(req.body) ? req.body : null;
    if (!contract) {
      this.sendBadRequest(res, "Failed to parse body");
      return;
    }

    if (!contract.contactId) {
      this.sendBadRequest(res, "contactId is required");
      return;
    }

    const deliveryPlace: DeliveryPlaceModel = await models.findDeliveryPlaceByExternalId(contract.deliveryPlaceId);
    if (!deliveryPlace) {
      this.sendBadRequest(res, `Delivery place with ID "${contract.deliveryPlaceId}" could not be found`);
      return;
    }

    const proposedDeliveryPlace: DeliveryPlaceModel = contract.proposedDeliveryPlaceId ?
      await models.findDeliveryPlaceByExternalId(contract.proposedDeliveryPlaceId) :
      { ...deliveryPlace };

    if (!proposedDeliveryPlace) {
      this.sendBadRequest(res, `Proposed delivery place with ID "${contract.proposedDeliveryPlaceId}" could not be found`);
      return;
    }

    const itemGroup: ItemGroupModel = await models.findItemGroupByExternalId(contract.itemGroupId);
    if (!itemGroup) {
      this.sendBadRequest(res, `Item group with ID "${contract.itemGroupId}" could not be found`);
      return;
    }

    const userId = contract.contactId;
    const deliveryPlaceId = deliveryPlace.id;
    const proposedDeliveryPlaceId = proposedDeliveryPlace.id || deliveryPlace.id;
    const itemGroupId = itemGroup.id;
    const contractQuantity = contract.contractQuantity;
    const deliveredQuantity = contract.deliveredQuantity;
    const proposedQuantity = contract.proposedQuantity;
    let startDate = contract.startDate;
    let endDate = contract.endDate;
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
    const proposedDeliverAll = contract.proposedDeliverAll;

    let sapId = contract.sapId || null;

    if (contract.status === "APPROVED") {
      try {
        const user = await userManagement.findUser(userId);
        const businessPartnerCode = user ?
          userManagement.getSingleAttribute(user, UserProperty.SAP_BUSINESS_PARTNER_CODE) :
          null;

        if (!businessPartnerCode) {
          this.sendInternalServerError(res, `Could not resolve SAP business partner code for user ${userId}`);
          return;
        }

        const sapContract = await this.createSapContract(
          businessPartnerCode,
          itemGroup.sapId,
          contract.deliveredQuantity,
          startDate,
          endDate,
          signDate,
          remarks
        );

        sapId = sapContract.id!;
      } catch (error) {
        this.sendInternalServerError(res, createStackedReject("Could not create contract to SAP", error));
        return;
      }
    }

    const createdContract = await models.createContract(
      userId,
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
      proposedDeliverAll,
      remarks,
      deliveryPlaceComment,
      quantityComment,
      rejectComment
    );

    if (createdContract.status === "DRAFT") {
      this.sendContractChangePushNotification(
        userId,
        `Uusi sopimusluonnos ${itemGroup.displayName || itemGroup.name} / ${year}`,
        `Uusi sopimusluonnos marjasta: ${itemGroup.displayName || itemGroup.name} odottaa tarkastusta.`
      );
    }

    res.status(200).send(await this.translateDatabaseContract(createdContract));
  }

  /**
   * @inheritdoc
   */
  async createContractPreviews(req: Request, res: Response) {
    if (!this.hasRealmRole(req, ApplicationRoles.CREATE_CONTRACT)) {
      this.sendForbidden(res, "You have no permission to import contracts");
      return;
    }

    const importFile = req.file;
    if (!importFile) {
      this.sendBadRequest(res, "No import file attached");
      return;
    }

    const workSheets = xlsx.parse(req.file.buffer);
    if (!_.isObject(workSheets) || !workSheets.length) {
      this.sendBadRequest(res, "No worksheets in imported xlsx file");
      return;
    }

    const { data } = workSheets[0];
    if (data.length < 2) {
      this.sendBadRequest(res, "Worksheet does not contain any rows");
      return;
    }

    try {
      const contractRows: string[][] = data.slice(1);
      const contractDataList: ContractPreviewData[] = [];

      for (let i = 0; i < contractRows.length; i++) {
        const contractRow = contractRows[i];
        if (contractRow.every(column => !column)) {
          continue;
        }

        const contract: ContractOpt = {};
        const contractErrors: { key: keyof Contract, message: string }[] = [];
        const importedContract: ImportedContractOpt = {};

        const contactSapId = this.getContractRowValue(contractRow, 0);
        if (!contactSapId) {
          contractErrors.push({
            key: "contactId",
            message: this.getImportedContractErrorMessage("userSapIdNotFound")
          });
        }

        const user = await userManagement.findUserByProperty(UserProperty.SAP_BUSINESS_PARTNER_CODE, `${contactSapId}`);
        if (!user) {
          contractErrors.push({
            key: "contactId",
            message: this.getImportedContractErrorMessage("userNotFound")
          });
        }

        const userId = user ? user.id : undefined;
        const firstName = user ? user.firstName : undefined;
        const lastName = user ? user.lastName : undefined;
        contract.contactId = userId || undefined;
        importedContract.contactName = firstName && lastName ? `${firstName} ${lastName}` : "";

        const deliveryPlaceSapId = this.getContractRowValue(contractRow, 5);
        const deliveryPlace = await models.findDeliveryPlaceBySapId(`${deliveryPlaceSapId}`);
        if (!deliveryPlace) {
          contractErrors.push({
            key: "deliveryPlaceId",
            message: this.getImportedContractErrorMessage("deliveryPlaceNotFound")
          });
        }

        const deliveryPlaceId = deliveryPlace ? deliveryPlace.externalId : undefined;
        const deliveryPlaceName = deliveryPlace ? deliveryPlace.name : undefined;
        contract.deliveryPlaceId = deliveryPlaceId;
        importedContract.deliveryPlaceName = deliveryPlaceName;

        const itemGroupSapId = this.getContractRowValue(contractRow, 1);
        const itemGroup = await models.findItemGroupBySapId(`${itemGroupSapId}`);
        if (!itemGroup) {
          contractErrors.push({
            key: "itemGroupId",
            message: this.getImportedContractErrorMessage("itemGroupNotFound")
          });
        }

        const itemGroupId = itemGroup ? itemGroup.externalId : undefined;
        const itemGroupName = itemGroup ? itemGroup.name : undefined;
        contract.itemGroupId = itemGroupId;
        importedContract.itemGroupName = itemGroupName;

        const deliveryPlaceComment = this.getContractRowValue(contractRow, 6);
        contract.deliveryPlaceComment = deliveryPlaceComment;
        importedContract.deliveryPlaceComment = deliveryPlaceComment;

        const contractQuantity = this.getContractRowValue(contractRow, 2);
        const invalidQuantity = Number.isNaN(contractQuantity);
        if (!contractQuantity) {
          contractErrors.push({
            key: "contractQuantity",
            message: this.getImportedContractErrorMessage("contractQuantityNotFound")
          });
        } else if (invalidQuantity) {
          contractErrors.push({
            key: "contractQuantity",
            message: this.getImportedContractErrorMessage("contractQuantityNotValid")
          });
        }

        contract.contractQuantity = !invalidQuantity ? contractQuantity || 0 : 0;
        importedContract.contractQuantity = contractQuantity ? `${contractQuantity}` : "";

        const quantityComment = this.getContractRowValue(contractRow, 3);
        contract.quantityComment = quantityComment ? `${quantityComment}` : undefined;
        importedContract.quantityComment = quantityComment ? `${quantityComment}` : undefined;

        const deliverAll = this.getContractRowValue(contractRow, 4);
        const deliverAllAllowed = itemGroupId ?
          await this.deliverAllAllowed(itemGroupId) :
          false;

        if (deliverAll && !deliverAllAllowed) {
          contractErrors.push({
            key: "deliverAll",
            message: this.getImportedContractErrorMessage("deliverAllNotAllowed")
          });
        }

        contract.deliverAll = !!deliverAll;
        importedContract.deliverAll = deliverAll ? `${deliverAll}` : "";

        const remarks = this.getContractRowValue(contractRow, 7);
        contract.remarks = remarks ? `${remarks}` : "";
        importedContract.remarks = remarks ? `${remarks}` : "";

        const contractPreviewData: ContractPreviewData = {
          contract: {
            id: null,
            sapId: null,
            year: this.inTestMode() ? 2021 : new Date().getFullYear(),
            contactId: contract.contactId || null,
            deliveryPlaceId: contract.deliveryPlaceId || "",
            proposedDeliveryPlaceId: null,
            deliveryPlaceComment: contract.deliveryPlaceComment || null,
            itemGroupId: contract.itemGroupId || "",
            contractQuantity: contract.contractQuantity || null,
            proposedQuantity: null,
            deliveredQuantity: null,
            quantityComment: contract.quantityComment || null,
            deliverAll: contract.deliverAll || false,
            proposedDeliverAll: false,
            status: ContractStatus.DRAFT,
            areaDetails: null,
            startDate: null,
            endDate: null,
            signDate: null,
            termDate: null,
            rejectComment: null,
            remarks: contract.remarks || null
          },
          importedContract: {
            contactName: importedContract.contactName || "",
            deliveryPlaceName: importedContract.deliveryPlaceName || "",
            deliveryPlaceComment: importedContract.deliveryPlaceComment || "",
            itemGroupName: importedContract.itemGroupName || "",
            contractQuantity: importedContract.contractQuantity || "",
            quantityComment: importedContract.quantityComment || "",
            deliverAll: importedContract.deliverAll || "",
            remarks: importedContract.remarks || ""
          },
          errors: contractErrors
        };

        contractDataList.push(contractPreviewData);
      }

      res.send(contractDataList);
    } catch (e) {
      this.sendInternalServerError(res, `Failed to import contracts. Reason: ${e}`);
      return;
    }
  }

  /**
   * @inheritdoc
   */
  async findContract(req: Request, res: Response) {
    const contractId = req.params.id;
    if (!contractId) {
      this.sendNotFound(res);
      return;
    }

    const databaseContract = await models.findContractByExternalId(contractId);
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
  async updateContract(req: Request, res: Response) {
    const contractId = req.params.id;
    if (!contractId) {
      this.sendNotFound(res);
      return;
    }

    const databaseContract: ContractModel = await models.findContractByExternalId(contractId);
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

    const payload: Contract = _.isObject(req.body) ? req.body : null;
    if (!payload) {
      this.sendBadRequest(res, "Failed to parse body");
      return;
    }

    if (!payload.itemGroupId) {
      this.sendBadRequest(res, "itemGroupId is required");
      return;
    }

    const deliveryPlace = payload.deliveryPlaceId ?
      await models.findDeliveryPlaceByExternalId(payload.deliveryPlaceId) :
      null;

    const proposedDeliveryPlace = payload.proposedDeliveryPlaceId ?
      await models.findDeliveryPlaceByExternalId(payload.proposedDeliveryPlaceId) :
      null;

    const itemGroup = payload.itemGroupId ?
      await models.findItemGroupByExternalId(payload.itemGroupId) :
      null;

    if (!itemGroup) {
      this.sendBadRequest(res, "Invalid itemGroupId");
      return;
    }

    // May not be edited by users without UPDATE_OTHER_CONTRACTS -permission
    let year = payload.year;
    let deliveryPlaceId = deliveryPlace ? deliveryPlace.id : null;
    let itemGroupId = itemGroup.id;
    let sapId = payload.sapId;
    let contractQuantity = payload.contractQuantity;
    let deliveredQuantity = payload.deliveredQuantity;
    let startDate = payload.startDate;
    let endDate = payload.endDate;
    let signDate = payload.signDate;
    let termDate = payload.termDate;
    let remarks = payload.remarks;
    let deliverAll = payload.deliverAll;

    // May be edited by users that own the contract
    const proposedDeliveryPlaceId = proposedDeliveryPlace ? proposedDeliveryPlace.id : null;
    const proposedQuantity = payload.proposedQuantity;
    const areaDetails = payload.areaDetails;
    const proposedDeliverAll = payload.proposedDeliverAll;
    const deliveryPlaceComment = payload.deliveryPlaceComment;
    const quantityComment = payload.quantityComment;
    const rejectComment = payload.rejectComment;

    // Derived if the user does not have UPDATE_OTHER_CONTRACTS -permission
    let status = payload.status;

    if (!canUpdateOthers) {
      year = databaseContract.year;
      deliveryPlaceId = databaseContract.deliveryPlaceId;
      itemGroupId = databaseContract.itemGroupId;
      sapId = databaseContract.sapId || null;
      contractQuantity = databaseContract.contractQuantity;
      deliveredQuantity = databaseContract.deliveredQuantity;
      startDate = databaseContract.startDate;
      endDate = databaseContract.endDate;
      signDate = databaseContract.signDate;
      termDate = databaseContract.termDate;
      remarks = databaseContract.remarks;
      deliverAll = databaseContract.deliverAll;

      if (payload.status === "REJECTED") {
        status = "REJECTED";
      } else if (!payload.status || payload.status === "DRAFT" || payload.status === "ON_HOLD") {
        if (
          contractQuantity === proposedQuantity &&
          deliveryPlaceId === proposedDeliveryPlaceId &&
          deliverAll === proposedDeliverAll
        ) {
          status = "DRAFT";
        } else {
          status = "ON_HOLD";
        }
      } else {
        this.sendForbidden(res, "You have no permission to update contract status");
        return;
      }
    }

    if (status === "APPROVED" && !databaseContract.sapId && !payload.sapId) {
      try {
        const user = await userManagement.findUser(databaseContract.userId);
        const businessPartnerCode = user ?
          userManagement.getSingleAttribute(user, UserProperty.SAP_BUSINESS_PARTNER_CODE) :
          null;

        if (!businessPartnerCode) {
          this.sendInternalServerError(res, `Could not resolve SAP business partner code for user ${databaseContract.userId}`);
          return;
        }

        const sapContract = await this.createSapContract(
          businessPartnerCode,
          itemGroup.sapId,
          deliveredQuantity,
          startDate,
          endDate,
          signDate,
          remarks
        );

        sapId = sapContract.id!;
      } catch (error) {
        this.sendInternalServerError(res, createStackedReject("Could not create contract to SAP", error));
        return;
      }
    }

    try {
      await models.updateContract(
        databaseContract.id,
        year,
        deliveryPlaceId,
        proposedDeliveryPlaceId,
        itemGroupId,
        sapId || null,
        contractQuantity || null,
        deliveredQuantity || null,
        proposedQuantity || null,
        startDate || null,
        endDate || null,
        signDate || null,
        termDate || null,
        status,
        areaDetails ? JSON.stringify(areaDetails) : "",
        deliverAll,
        proposedDeliverAll,
        remarks || null,
        deliveryPlaceComment || null,
        quantityComment || null,
        rejectComment || null
      );

      const updatedDatabaseContract = await models.findContractById(databaseContract.id);

      if (payload.status !== "APPROVED" || updatedDatabaseContract.status !== "APPROVED") {
        this.sendContractChangePushNotification(
          updatedDatabaseContract.userId,
          `Sopimus ${itemGroup.displayName || itemGroup.name} / ${year} päivittyi`,
          `Sopimus ${itemGroup.displayName || itemGroup.name} siirtyi tilaan ${this.getContractStatusDisplayName(updatedDatabaseContract.status)}`
        );
      }

      res.status(200).send(await this.translateDatabaseContract(updatedDatabaseContract));
    } catch (error) {
      this.sendInternalServerError(res, createStackedReject("Could not update contract", error));
      return;
    }
  }

  /**
   * @inheritdoc
   */
  async getContractDocument(req: Request, res: Response) {
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

    const contract: ContractModel = await models.findContractByExternalId(contractId);
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
              res.setHeader("Content-Type", "application/pdf");
              res.setHeader("Content-Disposition", `attachment; filename=${document.filename}`);
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
  async createContractDocumentTemplate(req: Request, res: Response) {
    if (!this.hasRealmRole(req, ApplicationRoles.CREATE_CONTRACT_DOCUMENT_TEMPLATES)) {
      this.sendForbidden(res, "You have no permission to create contract document templates");
      return;
    }

    const contractId = req.params.contractId;
    if (!contractId) {
      this.sendNotFound(res);
      return;
    }

    const databaseContract = await models.findContractByExternalId(contractId);
    if (!databaseContract) {
      this.sendNotFound(res);
      return;
    }

    const payload: ContractDocumentTemplate = _.isObject(req.body) ? req.body : null;
    if (!payload) {
      this.sendBadRequest(res, "Failed to parse body");
      return;
    }

    const databaseDocumentTemplate = await models.createDocumentTemplate(payload.contents, payload.header || null, payload.footer || null);
    const databaseContractDocumentTemplate = await models.createContractDocumentTemplate(payload.type, databaseContract.id, databaseDocumentTemplate.id);

    res.status(200).send(this.translateContractDocumentTemplate(databaseContractDocumentTemplate, databaseContract, databaseDocumentTemplate));
  }

  /**
   * @inheritdoc
   */
  async findContractDocumentTemplate(req: Request, res: Response) {
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

    const databaseContractDocumentTemplate = await models.findContractDocumentTemplateByExternalId(contractDocumentTemplateId);
    if (!databaseContractDocumentTemplate) {
      this.sendNotFound(res);
      return;
    }

    const databaseContract = await models.findContractByExternalId(contractId);
    if (!databaseContract) {
      this.sendNotFound(res);
      return;
    }

    if (databaseContractDocumentTemplate.contractId !== databaseContract.id) {
      this.sendNotFound(res);
      return;
    }

    const databaseDocumentTemplate = await models.findDocumentTemplateById(databaseContractDocumentTemplate.documentTemplateId);
    if (!databaseDocumentTemplate) {
      this.sendNotFound(res);
      return;
    }

    res.status(200).send(this.translateContractDocumentTemplate(databaseContractDocumentTemplate, databaseContract, databaseDocumentTemplate));
  }

  /**
   * @inheritdoc
   */
  async listContractDocumentTemplates(req: Request, res: Response) {
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

    const contract = await models.findContractByExternalId(contractId);
    if (!contract) {
      this.sendNotFound(res);
      return;
    }

    const databaseContractDocumentTemplates = await this.listDatabaseContractDocumentTemplates(contract.id, type);
    const contractDocumentTemplates: ContractDocumentTemplate[] = await Promise.all(databaseContractDocumentTemplates.map((databaseContractDocumentTemplate: ContractDocumentTemplateModel) => {
      return models.findDocumentTemplateById(databaseContractDocumentTemplate.documentTemplateId)
        .then((databaseDocumentTemplate) => {
          return this.translateContractDocumentTemplate(databaseContractDocumentTemplate, contract, databaseDocumentTemplate);
        });
    }));

    res.status(200).send(contractDocumentTemplates);
  }

  /**
   * @inheritdoc
   */
  async updateContractDocumentTemplate(req: Request, res: Response) {
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

    const databaseContractDocumentTemplate = await models.findContractDocumentTemplateByExternalId(contractDocumentTemplateId);
    if (!databaseContractDocumentTemplate) {
      this.sendNotFound(res);
      return;
    }

    const databaseContract = await models.findContractByExternalId(contractId);
    if (!databaseContract) {
      this.sendNotFound(res);
      return;
    }

    if (databaseContractDocumentTemplate.contractId !== databaseContract.id) {
      this.sendNotFound(res);
      return;
    }

    const databaseDocumentTemplate = await models.findDocumentTemplateById(databaseContractDocumentTemplate.documentTemplateId);
    if (!databaseDocumentTemplate) {
      this.sendNotFound(res);
      return;
    }

    const payload: ContractDocumentTemplate = _.isObject(req.body) ? req.body : null;
    if (!payload) {
      this.sendBadRequest(res, "Failed to parse body");
      return;
    }

    await models.updateDocumentTemplate(databaseDocumentTemplate.id, payload.contents, payload.header || null, payload.footer || null);

    const updatedDocumentTemplate = await models.findDocumentTemplateById(databaseContractDocumentTemplate.documentTemplateId);
    if (!updatedDocumentTemplate) {
      this.sendInternalServerError(res, "Failed to update document template");
      return;
    }

    res.status(200).send(this.translateContractDocumentTemplate(databaseContractDocumentTemplate, databaseContract, updatedDocumentTemplate));
  }

  /**
   * @inheritdoc
   */
  async listContractPrices(req: Request, res: Response) {
    const contractId = req.params.contractId;
    const sortBy = req.query.sortBy;
    const sortDir = req.query.sortDir;
    const firstResult = parseInt(req.query.firstResult) || 0;
    const maxResults = parseInt(req.query.maxResults) || 5;

    if (!contractId) {
      this.sendNotFound(res);
      return;
    }

    const databaseContract = await models.findContractByExternalId(contractId);
    if (!databaseContract) {
      this.sendNotFound(res);
      return;
    }

    const loggedUserId = this.getLoggedUserId(req);
    if (loggedUserId !== databaseContract.userId && !this.hasRealmRole(req, ApplicationRoles.LIST_ALL_CONTRACTS)) {
      this.sendForbidden(res, "You have no permission to list this contracts prices");
      return;
    }

    const databaseItemGroup = await models.findItemGroupById(databaseContract.itemGroupId);
    if (!databaseItemGroup) {
      this.sendInternalServerError(res, "Database item group not found");
      return;
    }

    const orderBy = sortBy === "YEAR" ? "year" : null;
    const prices = await models.listItemGroupPrices(databaseItemGroup.id, null, firstResult, maxResults, orderBy, sortDir);

    res.status(200).send(prices.map((price) => {
      return this.translateItemGroupPrice(price, databaseItemGroup);
    }));
  }

  /**
   * @inheritdoc
   */
  async listContracts(req: Request, res: Response) {
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

    const databaseItemGrouplId = itemGroupExternalId ? (await models.findItemGroupByExternalId(itemGroupExternalId)) : null;
    const itemGroupId = databaseItemGrouplId ? databaseItemGrouplId.id : null;
    const userId = listAll ? null : this.getLoggedUserId(req);
    const databaseContracts = await models.listContracts(userId, itemGroupCategory, itemGroupId, year, status, firstResult, maxResults);

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
        const count = await models.countContracts(userId, itemGroupCategory, itemGroupId, year, status);
        res.header("Total-Count", String(count));
        res.status(200).send(await Promise.all(databaseContracts.map((databaseContract) => {
          return this.translateDatabaseContract(databaseContract);
        })));
        break;
    }
  }

  /**
   * @inheritdoc
   */
  async listContractQuantities(req: Request, res: Response) {
    if (!this.hasRealmRole(req, ApplicationRoles.VIEW_CONTRACT_QUANTITIES)) {
      this.sendForbidden(res, "You have no permission to view contracts quantities");
      return;
    }

    const itemGroupExternalId = req.query.itemGroupId;
    const contactExternalId = req.query.contactId;
    const status = "APPROVED";
    const mode = config().mode;
    const year = mode === "TEST" ? 2017 : new Date().getFullYear();

    if (!itemGroupExternalId) {
      this.sendBadRequest(res, "Request with no itemgroup ID");
      return;
    }

    if (!contactExternalId) {
      this.sendBadRequest(res, "Request with no contact ID");
      return;
    }

    const databaseItemGrouplId = await models.findItemGroupByExternalId(itemGroupExternalId);
    const itemGroupId = databaseItemGrouplId.id;

    if (!itemGroupId) {
      this.sendBadRequest(res, "Request with invalid itemgroup ID");
      return;
    }

    const databaseContracts = await models.listContracts(contactExternalId, null, itemGroupId, year, status);

    res.status(200).send(await Promise.all(databaseContracts.map((databaseContract) => {
      return {
        contractQuantity: databaseContract.contractQuantity,
        deliveredQuantity: databaseContract.deliveredQuantity
      };
    })));
  }

  /**
   * @inheritdoc
   */
  async createContractDocumentSignRequest(req: Request, res: Response) {
    const contractId = req.params.id;
    const type = req.params.type;
    const ssn = req.query.ssn;
    const authService = req.query.authService;

    if (!contractId || !type) {
      this.sendNotFound(res);
      return;
    }

    const contract = await models.findContractByExternalId(contractId);
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

    const itemGroup = await models.findItemGroupById(contract.itemGroupId);
    if (!itemGroup) {
      this.sendNotFound(res);
      return;
    }

    if (itemGroup.prerequisiteContractItemGroupId) {
      const prerequisiteContracts = await models.listContracts(userId, null, itemGroup.prerequisiteContractItemGroupId, contract.year, "APPROVED", 0, 1);
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
    const buffers = parts.map((part: any) => Buffer.isBuffer(part) ? part : Buffer.from(part));
    const fileBuffer = Buffer.concat(buffers);
    const existingContractDocument = await models.findContractDocumentByContractAndType(contract.id, type);

    if (config().mode === "TEST") {
      const result: ContractDocumentSignRequest = {redirectUrl: "about:testmode" };
      // TODO: It's currently not possible to test sign service because
      // VismaSign does not provide  test account
      res.send(result);
      return;
    }

    if (existingContractDocument !== null) {
      if (existingContractDocument.signed) {
        this.sendBadRequest(res, "Contract document is already signed");
        return;
      } else {
        try {
          await signature.cancelDocument(existingContractDocument.vismaSignDocumentId);
        } catch (e) {
          this.logger.error(`Failed to cancel document ${existingContractDocument.vismaSignDocumentId} from VismaSign`, e);
        }

        try {
          await signature.deleteDocument(existingContractDocument.vismaSignDocumentId);
        } catch (e) {
          this.logger.error(`Failed to delete document ${existingContractDocument.vismaSignDocumentId} from VismaSign`, e);
        }

        await models.deleteContractDocument(existingContractDocument.id);
      }
    }

    const redirectUrl = req.query.redirectUrl ? encodeURIComponent(req.query.redirectUrl) : "";
    const vismaSignDocumentId = await signature.createDocument(document.documentName);

    await models.createContractDocument(type, contract.id, vismaSignDocumentId);

    const invitation = await signature.requestSignature(vismaSignDocumentId, document.filename, fileBuffer);

    const appUrl = `${req.protocol}://${req.get("host")}`;
    const returnUrl = `${appUrl}/signcallback?vismaSignId=${vismaSignDocumentId}&type=contract-document&contractId=${contractId}&type=${type}&redirectUrl=${redirectUrl}`;

    const fulfillResult = await signature.fulfillInvitation(
      invitation && invitation.uuid ? invitation.uuid : "",
      returnUrl,
      ssn,
      authService
    );

    const result: ContractDocumentSignRequest = {
      redirectUrl: fulfillResult && fulfillResult.location ? fulfillResult.location : ""
    };

    res.send(result);
  }

  /**
   * Creates SAP contract
   *
   * @param businessPartnerCode business partner code
   * @param itemGroupCode item group code
   * @param deliveredQuantity delivered quantity
   * @param startDate start date
   * @param endDate end date
   * @param signDate sign date
   * @param terminateDate terminate date
   * @param remarks remarks
   */
  private createSapContract = async (
    businessPartnerCode: string,
    itemGroupCode: string,
    deliveredQuantity: number | null,
    startDate: Date | null,
    endDate: Date | null,
    signDate: Date | null,
    remarks: string | null
  ) => {
    try {
      const contractsApi = await ErpClient.getContractsApi();

      const contractStartDate = startDate ?
        new Date(startDate) :
        new Date();
      const contractEndDate = endDate ?
        new Date(endDate) :
        new Date(`${new Date().getFullYear() + 1}-01-31`);
      const contractSigningDate = signDate ?
        new Date(signDate) :
        new Date();

      const response = await contractsApi.createContract({
        businessPartnerCode: parseInt(businessPartnerCode),
        contactPersonCode: 0,
        itemGroupCode: parseInt(itemGroupCode),
        deliveredQuantity: deliveredQuantity || 0,
        startDate: contractStartDate.toISOString(),
        endDate: contractEndDate.toISOString(),
        signingDate: contractSigningDate.toISOString(),
        terminateDate: undefined,
        remarks: remarks || "",
        status: SapContractStatus.Approved
      });

      if (response.response.statusCode !== 200) {
        throw new Error(`Could not create SAP contract: ${response.response.statusMessage}`);
      }

      return response.body;
    } catch (error) {
      return Promise.reject(
        createStackedReject(
          "Create SAP contract request failed.",
          error instanceof HttpError ?
            new Error(`${error.message}: ${JSON.stringify(error.body) || ""}`) :
            error
        )
      );
    }
  }

  /**
   * Translates Database contract into REST entity
   *
   * @param {Object} contract Sequelize contract model
   * @return {Contract} REST entity
   */
  async translateDatabaseContract(contract: ContractModel): Promise<Contract> {
    const [ itemGroup, deliveryPlace, proposedDeliveryPlace ] = await Promise.all([
      models.findItemGroupById(contract.itemGroupId),
      models.findDeliveryPlaceById(contract.deliveryPlaceId),
      models.findDeliveryPlaceById(contract.proposedDeliveryPlaceId)
    ]);

    const areaDetails = contract.areaDetails ?
      JSON.parse(contract.areaDetails) as AreaDetail[] :
      [];

    return {
      id: contract.externalId,
      sapId: contract.sapId || null,
      contactId: contract.userId,
      itemGroupId: itemGroup.externalId,
      deliveryPlaceId: deliveryPlace.externalId,
      proposedDeliveryPlaceId: proposedDeliveryPlace.externalId,
      contractQuantity: contract.contractQuantity,
      deliveredQuantity: contract.deliveredQuantity,
      proposedQuantity: contract.proposedQuantity,
      startDate: contract.startDate,
      endDate: contract.endDate,
      signDate: contract.signDate,
      termDate: contract.termDate,
      status: contract.status as ContractStatus,
      areaDetails: areaDetails,
      deliverAll: contract.deliverAll,
      proposedDeliverAll: contract.proposedDeliverAll,
      remarks: contract.remarks,
      year: contract.year,
      deliveryPlaceComment: contract.deliveryPlaceComment,
      quantityComment: contract.quantityComment,
      rejectComment: contract.rejectComment
    };
  }

  /**
   * Translates Database ContractDocumentTemplate into REST entity
   *
   * @param databaseContractDocumentTemplate Sequelize contract document template
   * @param databaseContract Sequelize contract model
   * @param databaseDocumentTemplate Sequelize document template
   */
  translateContractDocumentTemplate(databaseContractDocumentTemplate: ContractDocumentTemplateModel, databaseContract: ContractModel, databaseDocumentTemplate: DocumentTemplateModel): ContractDocumentTemplate {
    const result: ContractDocumentTemplate = {
      "id": databaseContractDocumentTemplate.externalId,
      "contractId": databaseContract.externalId,
      "type": databaseContractDocumentTemplate.type,
      "contents": databaseDocumentTemplate.contents,
      "header": databaseDocumentTemplate.header || null,
      "footer": databaseDocumentTemplate.footer || null
    };

    return result;
  }

  /**
   * Translates Database ItemGroupPrice into REST entity
   *
   * @param {ItemGroupPrice} databasePrice Sequelize item group price
   * @param {ItemGroup} itemGroup Sequelize item group
   */
  private translateItemGroupPrice(databasePrice: ItemGroupPriceModel, itemGroup: ItemGroupModel) {
    const result: ItemGroupPrice = {
      "id": databasePrice.externalId,
      "group": databasePrice.groupName,
      "unit": databasePrice.unit,
      "price": databasePrice.price,
      "year": databasePrice.year
    };

    return result;
  }

  /**
   * Exports array contracts as XLSX
   *
   * @param {Contract[]} contracts array of contracts
   * @returns {Object} object containing exported data buffer, filename and sheet name
   */
  async getContractsAsXLSX(contracts: ContractModel[]) {
    const name = "export";
    const filename =`${slugify(name)}.xlsx`;

    const columnHeaders = [
      i18n.__("contracts.exports.supplierId"),
      i18n.__("contracts.exports.companyName"),
      i18n.__("contracts.exports.itemGroupName"),
      i18n.__("contracts.exports.proposedQuantity"),
      i18n.__("contracts.exports.contractQuantity"),
      i18n.__("contracts.exports.deliveredQuantity"),
      i18n.__("contracts.exports.placeName"),
      i18n.__("contracts.exports.remarks"),
      i18n.__("contracts.exports.signDate"),
      i18n.__("contracts.exports.approvalDate")
    ];

    const rows = (await this.getContractXLSXRows(contracts)).filter((row) => row !== null && row !== undefined)

    return {
      name: name,
      filename: filename,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: excel.buildXLSX(name, columnHeaders, rows)
    };
  }

  /**
   * Returns contract datas as Excel rows
   *
   * @param {Contract[]} contracts array of contract objects
   * @returns {Promise} promise for XLSX rows
   */
  getContractXLSXRows(contracts: ContractModel[]) {
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
  async getContractXLSXRow(contract: ContractModel) {
    const user = await userManagement.findUser(contract.userId);

    if (!user) {
      return null;
    }

    const deliveryPlace = await models.findDeliveryPlaceById(contract.deliveryPlaceId);
    const itemGroup = await models.findItemGroupById(contract.itemGroupId);

    const supplierId = userManagement.getSingleAttribute(user, UserProperty.SAP_BUSINESS_PARTNER_CODE);
    const companyName = userManagement.getSingleAttribute(user, UserProperty.COMPANY_NAME);
    const itemGroupName = itemGroup ? itemGroup.name : null;
    const proposedQuantity = contract.proposedQuantity;
    const contractQuantity = contract.contractQuantity;
    const deliveredQuantity = contract.deliveredQuantity;
    const placeName = deliveryPlace ? deliveryPlace.name : null;
    const remarks = contract.remarks;
    const signDate = contract.signDate;
    const approvalDate = contract.termDate;

    return [
      supplierId,
      companyName,
      itemGroupName,
      proposedQuantity,
      contractQuantity,
      deliveredQuantity,
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
  async getContractDocumentHtml(baseUrl: string, contract: ContractModel, type: string): Promise<HtmlContractDocumentData|null> {
    try {
      const contractDocumentTemplate = await models.findContractDocumentTemplateByTypeAndContractId(type, contract.id);
      const itemGroupDocumentTemplate = !contractDocumentTemplate ? await models.findItemGroupDocumentTemplateByTypeAndItemGroupId(type, contract.itemGroupId) : null;
      if (!contractDocumentTemplate && !itemGroupDocumentTemplate) {
        return null;
      }

      const documentTemplateId = contractDocumentTemplate ? contractDocumentTemplate.documentTemplateId : itemGroupDocumentTemplate ? itemGroupDocumentTemplate.documentTemplateId : null;
      if (!documentTemplateId) {
        return null;
      }

      const documentTemplate = await models.findDocumentTemplateById(documentTemplateId);
      if (!documentTemplate) {
        return null;
      }

      const user = await userManagement.findUser(contract.userId);
      if (!user) {
        return null;
      }

      const year = this.inTestMode() ? 2019 : (new Date()).getFullYear();
      const companyName = userManagement.getSingleAttribute(user, UserProperty.COMPANY_NAME);
      const taxCode = userManagement.getSingleAttribute(user, UserProperty.TAX_CODE);
      const prices = await models.listItemGroupPrices(contract.itemGroupId, year, 0, 1000, null, null);
      const deliveryPlace = contract.deliveryPlaceId ? await models.findDeliveryPlaceById(contract.deliveryPlaceId) : null;
      const businessCode = taxCode ? this.getBusinessCode(taxCode) : null;
      const itemGroup: ItemGroupModel = await models.findItemGroupById(contract.itemGroupId);

      const templateData = {
        companyName: companyName,
        userFirstName: user.firstName,
        userLastName: user.lastName,
        contract: contract,
        itemGroup: itemGroup,
        prices: prices,
        deliveryPlace: deliveryPlace ? deliveryPlace.name : null,
        areaDetails: contract.areaDetails ? JSON.parse(contract.areaDetails) : [],
        contractStartDate: this.formatDate(contract.startDate),
        contractEndDate: this.formatDate(contract.endDate),
        contractSignDate: this.formatDate(contract.signDate),
        contractTermDate: this.formatDate(contract.termDate),
        isContractDraft: contract.status === "DRAFT",
        today: this.formatDate(new Date()),
        businessCode: businessCode,
        taxCode: taxCode
      };

      const content: string | null = await this.renderDocumentTemplateComponent(baseUrl, documentTemplate.contents, "contract-document.pug", templateData);
      if (!content) {
        return null;
      }

      const header: string | null = await this.renderDocumentTemplateComponent(baseUrl, documentTemplate.header, "contract-header.pug", templateData);
      const footer: string | null = await this.renderDocumentTemplateComponent(baseUrl, documentTemplate.footer, "contract-footer.pug", templateData);
      const documentName: string = this.getDocumentName(itemGroup, companyName);
      const documentSlug: string = this.getDocumentSlug(documentName);

      return {
        documentName: documentName,
        filename: `${documentSlug}.html`,
        content: content,
        header: header,
        footer: footer
      };
    } catch (e) {
      this.logger.error("Failed to generate contract document html", e);
      return null;
    }
  }

  /**
   * Renders contract document as HTML
   *
   * @param {String} baseUrl baseUrl
   * @param {Contract} contract contract
   * @param {String} type document type
   */
  async getContractDocumentPdf(baseUrl: string, contract: ContractModel, type: string): Promise<PdfContractDocument | null> {
    const contractDocument = await models.findContractDocumentByContractAndType(contract.id, type);
    if (contractDocument && contractDocument.vismaSignDocumentId && contractDocument.signed) {
      const documentFile = await signature.getDocumentFile(contractDocument.vismaSignDocumentId);
      if (documentFile) {
        const itemGroup = await models.findItemGroupById(contract.itemGroupId);
        const companyName = await this.getContractCompanyName(contract);
        const documentName = this.getDocumentName(itemGroup, companyName);
        const documentSlug = this.getDocumentSlug(documentName);

        return {
          documentName: documentName,
          filename: `${documentSlug}.pdf`,
          data: documentFile as any
        };
      }
    }

    const contractDocumentHtml: HtmlContractDocumentData|null = await this.getContractDocumentHtml(baseUrl, contract, type);
    if (!contractDocumentHtml) {
      return null;
    }

    const dataStream = await pdf.renderPdf(contractDocumentHtml.content, contractDocumentHtml.header, contractDocumentHtml.footer, baseUrl);

    return {
      documentName: contractDocumentHtml.documentName,
      filename: `${contractDocumentHtml.documentSlug}.pdf`,
      dataStream: dataStream
    };
  }

  /**
   * Lists contract document templates.
   *
   * @param {int} contractId contract id
   * @param {String} type template type. Optional, ignored if null
   * @returns {Object[]} array of Sequelize contract document templates
   */
  private listDatabaseContractDocumentTemplates(contractId: number, type: string): PromiseLike<ContractDocumentTemplateModel[]> {
    if (type) {
      return models.findContractDocumentTemplateByTypeAndContractId(type, contractId)
        .then((contractDocumentTemplate) => {
          if (contractDocumentTemplate) {
            return [contractDocumentTemplate];
          } else {
            return [];
          }
        });
    } else {
      return models.listContractDocumentTemplateByContractId(contractId);
    }
  }

  /**
   * Returns contract row value or undefined if not found
   *
   * @param contractRow contract row
   * @param index index
   * @returns value of index or undefined if not found
   */
  private getContractRowValue(contractRow: any[], index: number) {
    if (contractRow.length <= index || contractRow[index] === null) {
      return undefined;
    }

    return contractRow[index];
  }

  /**
   * Returns whether deliverAll is allowed for given item group
   *
   * @param itemGroupId item group ID
   */
  private deliverAllAllowed = (itemGroupId: string) => {
    return new Promise<boolean>((resolve, reject) => {
      fs.readFile(`${__dirname}/../../../app-config.json`, (error, file) => {
        if (error) {
          this.logger.error(`Could not read app-config.json. Reason: ${error}`);
          return reject();
        }

        try {
          const config = JSON.parse(file.toString());
          const itemGroups = config["item-groups"];
          if (!itemGroups) {
            this.logger.error("Could not read item groups from app-config.json");
            return reject();
          }

          const foundItemGroup = itemGroups[itemGroupId];
          if (!foundItemGroup) {
            this.logger.warn("Could not find item group from app-config.json");
            return resolve(false);
          }

          const allowDeliveryAll = foundItemGroup["allow-delivery-all"];
          return resolve(allowDeliveryAll || false);
        } catch (e) {
          this.logger.error(`Could not read contents of app-config.json. Reason: ${e}`);
          return reject();
        }
      });
    });
  }

  /**
   * Returns localized imported contract error message
   *
   * @param key message key in localization file
   */
  private getImportedContractErrorMessage = (key: string) => {
    return i18n.__(`contracts.imports.errors.${key}`);
  }

  /**
   * Returns company name for a contract
   *
   * @param {Contract} contract contract
   */
  private async getContractCompanyName(contract: ContractModel) {
    const user = await userManagement.findUser(contract.userId);
    if (!user) {
      return null;
    }

    return userManagement.getSingleAttribute(user, UserProperty.COMPANY_NAME);
  }

  /**
   * Returns contract document's name for a item group and company
   *
   * @param {ItemGroup} itemGroup item group
   * @param {String} companyName company name
   */
  private getDocumentName(itemGroup: ItemGroupModel, companyName: string | null): string {
    const result = `${moment().format("YYYY")} - ${itemGroup.name}`;
    if (companyName) {
      return `${result}, ${companyName}`;
    }

    return result;
  }

  /**
   * Slugifys document name
   *
   * @param {*} documentName
   */
  private getDocumentSlug(documentName: string): string {
    return slugify(documentName);
  }

  /**
   * Formats given date as finnish format
   *
   * @param {Date} date
   * @returns {String} given date as finnish format
   */
  private formatDate(date: Date) {
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
  private getBusinessCode(federalTaxId: string): string {
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
  private async renderDocumentTemplateComponent(baseUrl: string, mustacheTemplate: string, pugTemplateName: string, mustacheData: any): Promise<string|null> {
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

  private async loadMustachePartials() {
    const result = {};
    const partialFiles = await this.getMustachePartialFiles();
    const partials = await Promise.all(partialFiles.map((partialFile) => {
      return this.loadMustachePartial(partialFile);
    }));

    partialFiles.forEach((partialFile: string, index: number) => {
      const partialName = path.basename(partialFile, ".mustache");
      result[partialName] = partials[index];
    });

    return result;
  }

  private loadMustachePartial(file: string): Promise<string> {
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

  private getMustachePartialFiles(): Promise<string[]> {
    const folder = `${__dirname}/../../../mustache/`;

    return new Promise((resolve, reject) => {
      fs.readdir(folder, (err: Error, files: string[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(files.map((file: string) => {
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
  private async preprosessMustacheTemplate(template: string) {
    const partials = (await this.getMustachePartialFiles()).map((partialFile: string) => {
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
  private renderPugTemplate(template: string, model: { bodyContent: string, baseUrl: string } ) {
    const compiledPug = pug.compileFile(`${__dirname}/../../../templates/${template}`);
    return compiledPug(model);
  }

  /**
   * Gets display name for contract status
   *
   * @param {String} status contract status saved in database
   * @returns {String} display name for each contract status
   */
  private getContractStatusDisplayName(status: string) {
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
  private sendContractChangePushNotification(userId: string, title: string, content: string) {
    models.findUserSettingsByUserIdAndKey(userId, "contract-push-notifications")
      .then((userSetting) => {
        if (!userSetting) {
          pushNotifications.sendPushNotification(userId, title, content, true);
        } else {
          if (userSetting.settingValue !== "disabled") {
            pushNotifications.sendPushNotification(userId, title, content, userSetting.settingValue !== "silent");
          }
        }
      });
  }

  /**
   * Returns whether service is running in test mode
   */
  private inTestMode() {
    return config().mode === "TEST";
  }

}
