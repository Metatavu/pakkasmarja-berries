import * as _ from "lodash";
import { Response, Request } from "express";
import { ItemGroupPrice, ItemGroupDocumentTemplate, ItemGroup, ItemGroupCategory } from "../model/models";
import models, { ItemGroupModel, ItemGroupDocumentTemplateModel, DocumentTemplateModel, ItemGroupPriceModel } from "../../models";

import ItemGroupsService from "../api/itemGroups.service";
import ApplicationRoles from "../application-roles";

/**
 * Implementation for ItemGroups REST service
 */
export default class ItemGroupsServiceImpl extends ItemGroupsService {
  
  async findItemGroup(req: Request, res: Response) {
    const itemGroupId = req.params.id;
    if (!itemGroupId) {
      this.sendNotFound(res);
      return;
    }
    
    const databaseItemGroup = await models.findItemGroupByExternalId(itemGroupId);
    if (!databaseItemGroup) {
      this.sendNotFound(res);
      return;
    }
    
    res.status(200).send(await this.translateDatabaseItemGroup(databaseItemGroup));
  }
  
  /**
   * @inheritdoc
   */
  async listItemGroups(req: Request, res: Response) {
    const databaseItemGroups = await models.listItemGroups();
    const itemGroups = await Promise.all(databaseItemGroups.map((databaseItemGroup) => {
      return this.translateDatabaseItemGroup(databaseItemGroup);
    }));
    
    res.status(200).send(itemGroups);
  }

  /**
   * @inheritdoc
   */
  async findItemGroupDocumentTemplate(req: Request, res: Response) {
    if (!this.hasRealmRole(req, ApplicationRoles.LIST_ITEM_GROUP_DOCUMENT_TEMPLATES)) {
      this.sendForbidden(res, "You  do not have permission to find item group document templates");
      return;
    }

    const itemGroupId = req.params.itemGroupId;
    const id = req.params.id;
    if (!itemGroupId || !id) {
      this.sendNotFound(res);
      return;
    }
    
    const databaseItemGroupDocumentTemplate = await models.findItemGroupDocumentTemplateByExternalId(id);
    if (!databaseItemGroupDocumentTemplate) {
      this.sendNotFound(res);
      return;
    }

    const databaseItemGroup = await models.findItemGroupByExternalId(itemGroupId);
    if (!databaseItemGroup) {
      this.sendNotFound(res);
      return;
    }

    if (databaseItemGroupDocumentTemplate.itemGroupId !== databaseItemGroup.id) {
      this.sendNotFound(res);
      return;
    }

    const databaseDocumentTemplate = await models.findDocumentTemplateById(databaseItemGroupDocumentTemplate.documentTemplateId);
    if (!databaseDocumentTemplate) {
      this.sendNotFound(res);
      return;
    }

    res.status(200).send(this.translateItemGroupDocumentTemplate(databaseItemGroupDocumentTemplate, databaseItemGroup, databaseDocumentTemplate));
  }

  /**
   * @inheritdoc
   */
  async listItemGroupDocumentTemplates(req: Request, res: Response) {
    if (!this.hasRealmRole(req, ApplicationRoles.LIST_ITEM_GROUP_DOCUMENT_TEMPLATES)) {
      this.sendForbidden(res, "You  do not have permission to list item group document templates");
      return;
    }

    const itemGroupId = req.params.itemGroupId;
    if (!itemGroupId) {
      this.sendNotFound(res);
      return;
    }

    const databaseItemGroup = await models.findItemGroupByExternalId(itemGroupId);
    if (!databaseItemGroup) {
      this.sendNotFound(res);
      return;
    }

    const databaseItemGroupDocumentTemplates = await models.listItemGroupDocumentTemplateByItemGroupId(databaseItemGroup.id);
    const itemGroupDocumentTemplates = await Promise.all(databaseItemGroupDocumentTemplates.map((databaseItemGroupDocumentTemplate) => {
      return models.findDocumentTemplateById(databaseItemGroupDocumentTemplate.documentTemplateId)
        .then((databaseDocumentTemplate) => {
          return this.translateItemGroupDocumentTemplate(databaseItemGroupDocumentTemplate, databaseItemGroup, databaseDocumentTemplate);
        });
    }));

    res.status(200).send(itemGroupDocumentTemplates);
  }

  /**
   * @inheritdoc
   */
  async findItemGroupPrice(req: Request, res: Response) {
    const itemGroupId = req.params.itemGroupId;
    const priceId = req.params.priceId;

    if (!itemGroupId || !priceId) {
      this.sendNotFound(res);
      return;
    }

    const databaseItemGroup = await models.findItemGroupByExternalId(itemGroupId);
    if (!databaseItemGroup) {
      this.sendNotFound(res);
      return;
    }

    const databasePrice = await models.findItemGroupPriceByExternalId(priceId);
    if (!databasePrice) {
      this.sendNotFound(res);
      return;
    }

    if (databasePrice.itemGroupId !== databaseItemGroup.id) {
      this.sendNotFound(res);
      return;
    }

    res.status(200).send(this.translateItemGroupPrice(databasePrice, databaseItemGroup));
  }

  /**
   * @inheritdoc
   */
  async listItemGroupPrices(req: Request, res: Response) {
    const itemGroupId = req.params.itemGroupId;
    const sortBy = req.query.sortBy;
    const sortDir = req.query.sortDir;
    const firstResult = parseInt(req.query.firstResult) || 0;
    const maxResults = parseInt(req.query.maxResults) || 5;

    if (!itemGroupId) {
      this.sendNotFound(res);
      return;
    }

    const databaseItemGroup = await models.findItemGroupByExternalId(itemGroupId);
    if (!databaseItemGroup) {
      this.sendNotFound(res);
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
  async createItemGroupPrice(req: Request, res: Response) {
    if (!this.hasRealmRole(req, ApplicationRoles.CREATE_ITEM_GROUP_PRICES)) {
      this.sendForbidden(res, "You  do not have permission to create item group prices");
      return;
    }
    
    const itemGroupId = req.params.itemGroupId;
    if (!itemGroupId) {
      this.sendNotFound(res);
      return;
    }

    const databaseItemGroup = await models.findItemGroupByExternalId(itemGroupId);
    if (!databaseItemGroup) {
      this.sendNotFound(res);
      return;
    }

    const payload: ItemGroupPrice = _.isObject(req.body) ? req.body : null;
    if (!payload) {
      this.sendBadRequest(res, "Failed to parse body");
      return;
    }

    const requiredFields = ["group", "unit", "price", "year"];

    for (let i = 0; i < requiredFields.length; i++) {
      const requiredField = requiredFields[i];
      if (!payload[requiredField]) {
        this.sendBadRequest(res, `Group ${requiredField} is required`);
        return;
      }
    }

    const databasePrice = await models.createItemGroupPrice(databaseItemGroup.id, payload.group, payload.unit, payload.price, payload.year);

    res.status(200).send(this.translateItemGroupPrice(databasePrice, databaseItemGroup));
  }

  /**
   * @inheritdoc
   */
  async updateItemGroupPrice(req: Request, res: Response) {
    if (!this.hasRealmRole(req, ApplicationRoles.UPDATE_ITEM_GROUP_PRICES)) {
      this.sendForbidden(res, "You  do not have permission to update item group prices");
      return;
    }
    
    const itemGroupId = req.params.itemGroupId;
    const priceId = req.params.priceId;

    if (!itemGroupId || !priceId) {
      this.sendNotFound(res);
      return;
    }

    const databaseItemGroup = await models.findItemGroupByExternalId(itemGroupId);
    if (!databaseItemGroup) {
      this.sendNotFound(res);
      return;
    }

    const databasePrice = await models.findItemGroupPriceByExternalId(priceId);
    if (!databasePrice) {
      this.sendNotFound(res);
      return;
    }

    if (databasePrice.itemGroupId !== databaseItemGroup.id) {
      this.sendNotFound(res);
      return;
    }

    const payload: ItemGroupPrice = _.isObject(req.body) ? req.body : null;
    if (!payload) {
      this.sendBadRequest(res, "Failed to parse body");
      return;
    }

    await models.updateItemGroupPrice(databasePrice.id, databaseItemGroup.id, payload.group, payload.unit, payload.price, payload.year);

    const updatedDatabasePrice = await models.findItemGroupPriceById(databasePrice.id);

    res.status(200).send(this.translateItemGroupPrice(updatedDatabasePrice, databaseItemGroup));
  }

  /**
   * @inheritdoc
   */
  async deleteItemGroupPrice(req: Request, res: Response) {
    if (!this.hasRealmRole(req, ApplicationRoles.DELETE_ITEM_GROUP_PRICES)) {
      this.sendForbidden(res, "You  do not have permission to delete item group prices");
      return;
    }
    
    const itemGroupId = req.params.itemGroupId;
    const priceId = req.params.priceId;

    if (!itemGroupId || !priceId) {
      this.sendNotFound(res);
      return;
    }

    const databaseItemGroup = await models.findItemGroupByExternalId(itemGroupId);
    if (!databaseItemGroup) {
      this.sendNotFound(res);
      return;
    }

    const databasePrice = await models.findItemGroupPriceByExternalId(priceId);
    if (!databasePrice) {
      this.sendNotFound(res);
      return;
    }

    if (databasePrice.itemGroupId !== databaseItemGroup.id) {
      this.sendNotFound(res);
      return;
    }

    await models.deleteItemGroupPrice(databasePrice.id);

    res.status(204).send();
  }

  /**
   * @inheritdoc
   */
  async updateItemGroupDocumentTemplate(req: Request, res: Response) {
    if (!this.hasRealmRole(req, ApplicationRoles.UPDATE_ITEM_GROUP_DOCUMENT_TEMPLATES)) {
      this.sendForbidden(res, "You do not have permission to update item group document templates");
      return;
    }
    
    const itemGroupId = req.params.itemGroupId;
    const id = req.params.id;
    if (!itemGroupId || !id) {
      this.sendNotFound(res);
      return;
    }
    
    const databaseItemGroupDocumentTemplate = await models.findItemGroupDocumentTemplateByExternalId(id);
    if (!databaseItemGroupDocumentTemplate) {
      this.sendNotFound(res);
      return;
    }

    const databaseItemGroup = await models.findItemGroupByExternalId(itemGroupId);
    if (!databaseItemGroup) {
      this.sendNotFound(res);
      return;
    }

    if (databaseItemGroupDocumentTemplate.itemGroupId !== databaseItemGroup.id) {
      this.sendNotFound(res);
      return;
    }

    const databaseDocumentTemplate = await models.findDocumentTemplateById(databaseItemGroupDocumentTemplate.documentTemplateId);
    if (!databaseDocumentTemplate) {
      this.sendNotFound(res);
      return;
    }

    const payload: ItemGroupDocumentTemplate = _.isObject(req.body) ? req.body : null;
    if (!payload) {
      this.sendBadRequest(res, "Failed to parse body");
      return;
    }

    await models.updateDocumentTemplate(databaseDocumentTemplate.id, payload.contents, payload.header || null, payload.footer || null);

    const updatedDocumentTemplate = await models.findDocumentTemplateById(databaseItemGroupDocumentTemplate.documentTemplateId);
    if (!updatedDocumentTemplate) {
      this.sendInternalServerError(res, "Failed to update document template");
      return;
    }
    
    res.status(200).send(this.translateItemGroupDocumentTemplate(databaseItemGroupDocumentTemplate, databaseItemGroup, updatedDocumentTemplate));
  }

  /**
   * Translates Database item group into REST entity
   * 
   * @param {Object} itemGroup Sequelize item group model
   * @return {ItemGroup} REST entity
   */
  private async translateDatabaseItemGroup(itemGroup: ItemGroupModel) {
    const prerequisiteContractItemGroup = itemGroup.prerequisiteContractItemGroupId ? await models.findItemGroupById(itemGroup.prerequisiteContractItemGroupId) : null;
    const category: ItemGroupCategory = itemGroup.category == "FROZEN" ? "FROZEN" : "FRESH";

    const result: ItemGroup = {
      "id": itemGroup.externalId,
      "name": itemGroup.name,
      "displayName": itemGroup.displayName || null,
      "category": category,
      "minimumProfitEstimation": itemGroup.minimumProfitEstimation,
      "prerequisiteContractItemGroupId": prerequisiteContractItemGroup ? prerequisiteContractItemGroup.externalId : null
    };

    return result;
  }

  /**
   * Translates Database ItemGroupDocumentTemplate into REST entity
   * 
   * @param {*} databaseItemGroupDocumentTemplate Sequelize item group document template
   * @param {*} databaseItemGroup Sequelize item group model
   * @param {*} databaseDocumentTemplate Sequelize document template
   */
  translateItemGroupDocumentTemplate(databaseItemGroupDocumentTemplate: ItemGroupDocumentTemplateModel, databaseItemGroup: ItemGroupModel, databaseDocumentTemplate: DocumentTemplateModel) {
    const result: ItemGroupDocumentTemplate = {
      "id": databaseItemGroupDocumentTemplate.externalId,
      "itemGroupId": databaseItemGroup.externalId,
      "type": databaseItemGroupDocumentTemplate.type,
      "contents": databaseDocumentTemplate.contents,
      "header": databaseDocumentTemplate.header || null,
      "footer": databaseDocumentTemplate.footer || null
    };

    return result;
  }

  /**
   * Translates Database ItemGroupPrice into REST entity
   * 
   * @param {ItemGroupPrice} databasePrice Sequelize item group price
   * @param {ItemGroup} itemGroup Sequelize item group
   */
  translateItemGroupPrice(databasePrice: ItemGroupPriceModel, itemGroup: ItemGroupModel) {
    const result: ItemGroupPrice = {
      "id": databasePrice.externalId,
      "group": databasePrice.groupName,
      "unit": databasePrice.unit,
      "price": databasePrice.price,
      "year": databasePrice.year
    };

    return result;
  }
}