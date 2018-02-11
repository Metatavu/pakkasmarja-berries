/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';

  const _ = require('lodash');
  const AbstractContractsService = require(`${__dirname}/../service/contracts-service`);
  const Contract = require(`${__dirname}/../model/contract`);

  /**
   * Implementation for Contracts REST service
   */
  class ContractsServiceImpl extends AbstractContractsService {
    
  }

  module.exports = ContractsServiceImpl;

})();

