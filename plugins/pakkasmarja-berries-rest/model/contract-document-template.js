/* jshint ignore:start */
(function(root, factory) {
  module.exports = factory(require('../model-utils'));
}(this, function(ApiClient) {
  'use strict';
  const _ = require('lodash');




  /**
   * The ContractDocumentTemplate model module.
   * @module model/ContractDocumentTemplate
   * @version 0.0.3
   */

  /**
   * Constructs a new <code>ContractDocumentTemplate</code>.
   * @alias module:model/ContractDocumentTemplate
   * @class
   */
  var exports = function() {
    var _this = this;







  };

  /**
   * Constructs a <code>ContractDocumentTemplate</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/ContractDocumentTemplate} obj Optional instance to populate.
   * @return {module:model/ContractDocumentTemplate} The populated <code>ContractDocumentTemplate</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) {
      obj = obj || new exports();

      if (data.hasOwnProperty('id')) {
        obj['id'] = ApiClient.convertToType(data['id'], 'String');
      }
      if (data.hasOwnProperty('contractId')) {
        obj['contractId'] = ApiClient.convertToType(data['contractId'], 'String');
      }
      if (data.hasOwnProperty('type')) {
        obj['type'] = ApiClient.convertToType(data['type'], 'String');
      }
      if (data.hasOwnProperty('contents')) {
        obj['contents'] = ApiClient.convertToType(data['contents'], 'String');
      }
      if (data.hasOwnProperty('header')) {
        obj['header'] = ApiClient.convertToType(data['header'], 'String');
      }
      if (data.hasOwnProperty('footer')) {
        obj['footer'] = ApiClient.convertToType(data['footer'], 'String');
      }
    }
    return obj;
  }

  /**
   * @member {String} id
   */
  exports.prototype['id'] = undefined;
  /**
   * @member {String} contractId
   */
  exports.prototype['contractId'] = undefined;
  /**
   * @member {String} type
   */
  exports.prototype['type'] = undefined;
  /**
   * @member {String} contents
   */
  exports.prototype['contents'] = undefined;
  /**
   * @member {String} header
   */
  exports.prototype['header'] = undefined;
  /**
   * @member {String} footer
   */
  exports.prototype['footer'] = undefined;



  return exports;
}));


/* jshint ignore:end */