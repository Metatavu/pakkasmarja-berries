/* jshint ignore:start */
(function(root, factory) {
  module.exports = factory(require('../model-utils'));
}(this, function(ApiClient) {
  "use strict";
  const _ = require('lodash');




  /**
   * The ItemGroup model module.
   * @module model/ItemGroup
   * @version 0.0.3
   */

  /**
   * Constructs a new <code>ItemGroup</code>.
   * @alias module:model/ItemGroup
   * @class
   */
  var exports = function() {
    var _this = this;







  };

  /**
   * Constructs a <code>ItemGroup</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/ItemGroup} obj Optional instance to populate.
   * @return {module:model/ItemGroup} The populated <code>ItemGroup</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) {
      obj = obj || new exports();

      if (data.hasOwnProperty('id')) {
        obj['id'] = ApiClient.convertToType(data['id'], 'String');
      }
      if (data.hasOwnProperty('name')) {
        obj['name'] = ApiClient.convertToType(data['name'], 'String');
      }
      if (data.hasOwnProperty('displayName')) {
        obj['displayName'] = ApiClient.convertToType(data['displayName'], 'String');
      }
      if (data.hasOwnProperty('category')) {
        obj['category'] = ApiClient.convertToType(data['category'], 'String');
      }
      if (data.hasOwnProperty('minimumProfitEstimation')) {
        obj['minimumProfitEstimation'] = ApiClient.convertToType(data['minimumProfitEstimation'], 'Number');
      }
      if (data.hasOwnProperty('prerequisiteContractItemGroupId')) {
        obj['prerequisiteContractItemGroupId'] = ApiClient.convertToType(data['prerequisiteContractItemGroupId'], 'String');
      }
    }
    return obj;
  }

  /**
   * @member {String} id
   */
  exports.prototype['id'] = undefined;
  /**
   * @member {String} name
   */
  exports.prototype['name'] = undefined;
  /**
   * @member {String} displayName
   */
  exports.prototype['displayName'] = undefined;
  /**
   * @member {String} category
   */
  exports.prototype['category'] = undefined;
  /**
   * @member {Number} minimumProfitEstimation
   */
  exports.prototype['minimumProfitEstimation'] = undefined;
  /**
   * Require contract in specified item group before siging a contract
   * @member {String} prerequisiteContractItemGroupId
   */
  exports.prototype['prerequisiteContractItemGroupId'] = undefined;



  return exports;
}));


/* jshint ignore:end */