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
      
      res.status(200).send(this.translateDatabaseItemGroup(databaseItemGroup));
    }
    /* jshint ignore:end */
    
    /**
     * @inheritdoc
     */
    async listItemGroups(req, res) {
      const databaseItemGroups = await this.models.listItemGroups();
      const itemGroups = databaseItemGroups.map((databaseItemGroup) => {
        return this.translateDatabaseItemGroup(databaseItemGroup);
      });
      
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
    async listItemGroupPrices(req, res) {
      const itemGroupId = req.params.itemGroupId;
      const sortBy = req.query.sortBy;
      const sortDir = req.query.sortDir;
      const firstResult = parseInt(req.query.firstResult) || 0;
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

      const orderBy = sortBy === 'YEAR' ? 'year' : null;
      const prices = await this.models.listItemGroupPrices(databaseItemGroup.id, firstResult, maxResults, orderBy, sortDir);

      res.status(200).send(prices.map((price) => {
        return this.translateItemGroupPrice(price, databaseItemGroup);
      }));
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
    translateDatabaseItemGroup(itemGroup) {
      return ItemGroup.constructFromObject({
        "id": itemGroup.externalId,
        "name": itemGroup.name,
        "category": itemGroup.category
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

