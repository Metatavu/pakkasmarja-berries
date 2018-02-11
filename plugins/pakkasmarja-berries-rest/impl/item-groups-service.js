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
    
  }

  module.exports = ItemGroupsServiceImpl;

})();

