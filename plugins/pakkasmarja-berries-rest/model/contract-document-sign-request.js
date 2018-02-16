/* jshint ignore:start */
(function(root, factory) {
  module.exports = factory(require('../model-utils'));
}(this, function(ApiClient) {
  'use strict';
  const _ = require('lodash');




  /**
   * The ContractDocumentSignRequest model module.
   * @module model/ContractDocumentSignRequest
   * @version 0.0.1
   */

  /**
   * Constructs a new <code>ContractDocumentSignRequest</code>.
   * @alias module:model/ContractDocumentSignRequest
   * @class
   */
  var exports = function() {
    var _this = this;


  };

  /**
   * Constructs a <code>ContractDocumentSignRequest</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/ContractDocumentSignRequest} obj Optional instance to populate.
   * @return {module:model/ContractDocumentSignRequest} The populated <code>ContractDocumentSignRequest</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) {
      obj = obj || new exports();

      if (data.hasOwnProperty('redirectUrl')) {
        obj['redirectUrl'] = ApiClient.convertToType(data['redirectUrl'], 'String');
      }
    }
    return obj;
  }

  /**
   * @member {String} redirectUrl
   */
  exports.prototype['redirectUrl'] = undefined;



  return exports;
}));


/* jshint ignore:end */