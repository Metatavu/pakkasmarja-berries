/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';

  const _ = require('lodash');
  const AbstractItemGroupsService = require(`${__dirname}/../service/item-groups-service`);
  const ItemGroup = require(`${__dirname}/../model/item-group`);
  const ItemGroupDocumentTemplate = require(`${__dirname}/../model/item-group-document-template`);
  const Price = require(`${__dirname}/../model/price`);
  
  /**
   * Implementation for ItemGroups REST service
   */
  class ItemGroupsServiceImpl extends AbstractItemGroupsService {
    
    /**
     * Constructor for ItemGroups service
     * 
     * @param {Object} logger logger
     * @param {Object} models models
     */
    constructor (logger, models) {
      super();
      
      this.logger = logger;
      this.models = models;
    }
    
    /* jshint ignore:start */
    async findItemGroup(req, res) {
      const itemGroupId = req.params.id;
      if (!itemGroupId) {
        this.sendNotFound(res);
        return;
      }
      
      const databaseItemGroup = await this.models.findItemGroupByExternalId(itemGroupId);
      if (!databaseItemGroup) {
        this.sendNotFound(res);
        return;
      }
      
      res.status(200).send(await this.translateDatabaseItemGroup(databaseItemGroup));
    }
    /* jshint ignore:end */
    
    /**
     * @inheritdoc
     */
    async listItemGroups(req, res) {
      const databaseItemGroups = await this.models.listItemGroups();
      const itemGroups = await Promise.all(databaseItemGroups.map((databaseItemGroup) => {
        return this.translateDatabaseItemGroup(databaseItemGroup);
      }));
      
      res.status(200).send(itemGroups);
    }

    /**
     * @inheritdoc
     */
    async findItemGroupDocumentTemplate(req, res) {
      const itemGroupId = req.params.itemGroupId;
      const id = req.params.id;
      if (!itemGroupId || !id) {
        this.sendNotFound(res);
        return;
      }
      
      const databaseItemGroupDocumentTemplate = await this.models.findItemGroupDocumentTemplateByExternalId(id);
      if (!databaseItemGroupDocumentTemplate) {
        this.sendNotFound(res);
        return;
      }

      const databaseItemGroup = await this.models.findItemGroupByExternalId(itemGroupId);
      if (!databaseItemGroup) {
        this.sendNotFound(res);
        return;
      }

      if (databaseItemGroupDocumentTemplate.itemGroupId !== databaseItemGroup.id) {
        this.sendNotFound(res);
        return;
      }

      const databaseDocumentTemplate = await this.models.findDocumentTemplateById(databaseItemGroupDocumentTemplate.documentTemplateId);
      if (!databaseDocumentTemplate) {
        this.sendNotFound(res);
        return;
      }

      res.status(200).send(this.translateItemGroupDocumentTemplate(databaseItemGroupDocumentTemplate, databaseItemGroup, databaseDocumentTemplate));
    }

    /**
     * @inheritdoc
     */
    async listItemGroupDocumentTemplates(req, res) {
      const itemGroupId = req.params.itemGroupId;
      if (!itemGroupId) {
        this.sendNotFound(res);
        return;
      }

      const databaseItemGroup = await this.models.findItemGroupByExternalId(itemGroupId);
      if (!databaseItemGroup) {
        this.sendNotFound(res);
        return;
      }

      const databaseItemGroupDocumentTemplates = await this.models.listItemGroupDocumentTemplateByItemGroupId(databaseItemGroup.id);
      const itemGroupDocumentTemplates = await Promise.all(databaseItemGroupDocumentTemplates.map((databaseItemGroupDocumentTemplate) => {
        return this.models.findDocumentTemplateById(databaseItemGroupDocumentTemplate.documentTemplateId)
          .then((databaseDocumentTemplate) => {
            return this.translateItemGroupDocumentTemplate(databaseItemGroupDocumentTemplate, databaseItemGroup, databaseDocumentTemplate);
          });
      }));

      res.status(200).send(itemGroupDocumentTemplates);
    }

    /**
     * @inheritdoc
     */
    async findItemGroupPrice(req, res) {
      const itemGroupId = req.params.itemGroupId;
      const priceId = req.params.priceId;

      if (!itemGroupId || !priceId) {
        this.sendNotFound(res);
        return;
      }

      const databaseItemGroup = await this.models.findItemGroupByExternalId(itemGroupId);
      if (!databaseItemGroup) {
        this.sendNotFound(res);
        return;
      }

      const databasePrice = await this.models.findItemGroupPriceByExternalId(priceId);
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
    async listItemGroupPrices(req, res) {
      const itemGroupId = req.params.itemGroupId;
      const sortBy = req.query.sortBy;
      const sortDir = req.query.sortDir;
      const firstResult = parseInt(req.query.firstResult) || 0;
      const maxResults = parseInt(req.query.maxResults) || 5;

      if (!itemGroupId) {
        this.sendNotFound(res);
        return;
      }

      const databaseItemGroup = await this.models.findItemGroupByExternalId(itemGroupId);
      if (!databaseItemGroup) {
        this.sendNotFound(res);
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
    async createItemGroupPrice(req, res) {
      const itemGroupId = req.params.itemGroupId;
      if (!itemGroupId) {
        this.sendNotFound(res);
        return;
      }

      const databaseItemGroup = await this.models.findItemGroupByExternalId(itemGroupId);
      if (!databaseItemGroup) {
        this.sendNotFound(res);
        return;
      }

      const payload = _.isObject(req.body) ? Price.constructFromObject(req.body) : null;
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

      const databasePrice = await this.models.createItemGroupPrice(databaseItemGroup.id, payload.group, payload.unit, payload.price, payload.year);

      res.status(200).send(this.translateItemGroupPrice(databasePrice, databaseItemGroup));
    }

    /**
     * @inheritdoc
     */
    async updateItemGroupPrice(req, res) {
      const itemGroupId = req.params.itemGroupId;
      const priceId = req.params.priceId;

      if (!itemGroupId || !priceId) {
        this.sendNotFound(res);
        return;
      }

      const databaseItemGroup = await this.models.findItemGroupByExternalId(itemGroupId);
      if (!databaseItemGroup) {
        this.sendNotFound(res);
        return;
      }

      const databasePrice = await this.models.findItemGroupPriceByExternalId(priceId);
      if (!databasePrice) {
        this.sendNotFound(res);
        return;
      }

      if (databasePrice.itemGroupId !== databaseItemGroup.id) {
        this.sendNotFound(res);
        return;
      }

      const payload = _.isObject(req.body) ? Price.constructFromObject(req.body) : null;
      if (!payload) {
        this.sendBadRequest(res, "Failed to parse body");
        return;
      }

      await this.models.updateItemGroupPrice(databasePrice.id, databaseItemGroup.id, payload.group, payload.unit, payload.price, payload.year);

      const updatedDatabasePrice = await this.models.findItemGroupPriceById(databasePrice.id);

      res.status(200).send(this.translateItemGroupPrice(updatedDatabasePrice, databaseItemGroup));
    }

    /**
     * @inheritdoc
     */
    async deleteItemGroupPrice(req, res) {
      const itemGroupId = req.params.itemGroupId;
      const priceId = req.params.priceId;

      if (!itemGroupId || !priceId) {
        this.sendNotFound(res);
        return;
      }

      const databaseItemGroup = await this.models.findItemGroupByExternalId(itemGroupId);
      if (!databaseItemGroup) {
        this.sendNotFound(res);
        return;
      }

      const databasePrice = await this.models.findItemGroupPriceByExternalId(priceId);
      if (!databasePrice) {
        this.sendNotFound(res);
        return;
      }

      if (databasePrice.itemGroupId !== databaseItemGroup.id) {
        this.sendNotFound(res);
        return;
      }

      await this.models.deleteItemGroupPrice(databasePrice.id);

      res.status(204).send();
    }

    /**
     * @inheritdoc
     */
    async updateItemGroupDocumentTemplate(req, res) {
      const itemGroupId = req.params.itemGroupId;
      const id = req.params.id;
      if (!itemGroupId || !id) {
        this.sendNotFound(res);
        return;
      }
      
      const databaseItemGroupDocumentTemplate = await this.models.findItemGroupDocumentTemplateByExternalId(id);
      if (!databaseItemGroupDocumentTemplate) {
        this.sendNotFound(res);
        return;
      }

      const databaseItemGroup = await this.models.findItemGroupByExternalId(itemGroupId);
      if (!databaseItemGroup) {
        this.sendNotFound(res);
        return;
      }

      if (databaseItemGroupDocumentTemplate.itemGroupId !== databaseItemGroup.id) {
        this.sendNotFound(res);
        return;
      }

      const databaseDocumentTemplate = await this.models.findDocumentTemplateById(databaseItemGroupDocumentTemplate.documentTemplateId);
      if (!databaseDocumentTemplate) {
        this.sendNotFound(res);
        return;
      }

      const payload = _.isObject(req.body) ? ItemGroupDocumentTemplate.constructFromObject(req.body) : null;
      if (!payload) {
        this.sendBadRequest(res, "Failed to parse body");
        return;
      }

      await this.models.updateDocumentTemplate(databaseDocumentTemplate.id, payload.contents, payload.header, payload.footer);

      const updatedDocumentTemplate = await this.models.findDocumentTemplateById(databaseItemGroupDocumentTemplate.documentTemplateId);
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
    async translateDatabaseItemGroup(itemGroup) {
      const prerequisiteContractItemGroup = itemGroup.prerequisiteContractItemGroupId ? await this.models.findItemGroupById(itemGroup.prerequisiteContractItemGroupId) : null;

      return ItemGroup.constructFromObject({
        "id": itemGroup.externalId,
        "name": itemGroup.name,
        "displayName": itemGroup.displayName,
        "category": itemGroup.category,
        "minimumProfitEstimation": itemGroup.minimumProfitEstimation,
        "prerequisiteContractItemGroupId": prerequisiteContractItemGroup ? prerequisiteContractItemGroup.externalId : null
      });
    }

    /**
     * Translates Database ItemGroupDocumentTemplate into REST entity
     * 
     * @param {*} databaseItemGroupDocumentTemplate Sequelize item group document template
     * @param {*} databaseItemGroup Sequelize item group model
     * @param {*} databaseDocumentTemplate Sequelize document template
     */
    translateItemGroupDocumentTemplate(databaseItemGroupDocumentTemplate, databaseItemGroup, databaseDocumentTemplate) {
      return ItemGroupDocumentTemplate.constructFromObject({
        "id": databaseItemGroupDocumentTemplate.externalId,
        "itemGroupId": databaseItemGroup.externalId,
        "type": databaseItemGroupDocumentTemplate.type,
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
  }

  module.exports = ItemGroupsServiceImpl;

})();

