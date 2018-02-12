/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';

  const _ = require('lodash');
  const AbstractItemGroupsService = require(`${__dirname}/../service/item-groups-service`);
  const ItemGroup = require(`${__dirname}/../model/item-group`);

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
      if (!databaseItemGroup) {
        this.sendNotFound(res);
        return;
      }
      
      res.status(200).send(this.translateDatabaseItemGroup(databaseItemGroup));
    }
    /* jshint ignore:end */
    
    /**
     * @inheritdoc
     */
    /* jshint ignore:start */
    async listItemGroups(req, res) {
      const databaseItemGroups = await this.models.listItemGroups();
      const itemGroups = databaseItemGroups.map((databaseItemGroup) => {
        return this.translateDatabaseItemGroup(databaseItemGroup);
      });
      
      res.status(200).send(itemGroups);
    }
    /* jshint ignore:end */
    
    /**
     * Translates Database item group into REST entity
     * 
     * @param {Object} itemGroup Sequelize item group model
     * @return {ItemGroup} REST entity
     */
    translateDatabaseItemGroup(itemGroup) {
      return ItemGroup.constructFromObject({
        'id': itemGroup.externalId,
        'name': itemGroup.name
      });
    }
  }

  module.exports = ItemGroupsServiceImpl;

})();

