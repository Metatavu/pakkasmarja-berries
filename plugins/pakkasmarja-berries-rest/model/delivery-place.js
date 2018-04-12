/* jshint ignore:start */
(function(root, factory) {
  module.exports = factory(require('../model-utils'));
}(this, function(ApiClient) {
  "use strict";
  const _ = require('lodash');




  /**
   * The DeliveryPlace model module.
   * @module model/DeliveryPlace
   * @version 0.0.3
   */

  /**
   * Constructs a new <code>DeliveryPlace</code>.
   * @alias module:model/DeliveryPlace
   * @class
   */
  var exports = function() {
    var _this = this;



  };

  /**
   * Constructs a <code>DeliveryPlace</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/DeliveryPlace} obj Optional instance to populate.
   * @return {module:model/DeliveryPlace} The populated <code>DeliveryPlace</code> instance.
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



  return exports;
}));


/* jshint ignore:end */