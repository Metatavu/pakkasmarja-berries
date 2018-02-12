/* jshint ignore:start */
(function(root, factory) {
  module.exports = factory(require('../model-utils'));
}(this, function(ApiClient) {
  'use strict';
  const _ = require('lodash');




  /**
   * The Contract model module.
   * @module model/Contract
   * @version 0.0.1
   */

  /**
   * Constructs a new <code>Contract</code>.
   * @alias module:model/Contract
   * @class
   */
  var exports = function() {
    var _this = this;











  };

  /**
   * Constructs a <code>Contract</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/Contract} obj Optional instance to populate.
   * @return {module:model/Contract} The populated <code>Contract</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) {
      obj = obj || new exports();

      if (data.hasOwnProperty('id')) {
        obj['id'] = ApiClient.convertToType(data['id'], 'String');
      }
      if (data.hasOwnProperty('itemGroupId')) {
        obj['itemGroupId'] = ApiClient.convertToType(data['itemGroupId'], 'String');
      }
      if (data.hasOwnProperty('quantity')) {
        obj['quantity'] = ApiClient.convertToType(data['quantity'], 'Number');
      }
      if (data.hasOwnProperty('delivered')) {
        obj['delivered'] = ApiClient.convertToType(data['delivered'], 'Number');
      }
      if (data.hasOwnProperty('startDate')) {
        obj['startDate'] = ApiClient.convertToType(data['startDate'], 'Date');
      }
      if (data.hasOwnProperty('endDate')) {
        obj['endDate'] = ApiClient.convertToType(data['endDate'], 'Date');
      }
      if (data.hasOwnProperty('signDate')) {
        obj['signDate'] = ApiClient.convertToType(data['signDate'], 'Date');
      }
      if (data.hasOwnProperty('termDate')) {
        obj['termDate'] = ApiClient.convertToType(data['termDate'], 'Date');
      }
      if (data.hasOwnProperty('status')) {
        obj['status'] = ApiClient.convertToType(data['status'], 'String');
      }
      if (data.hasOwnProperty('remarks')) {
        obj['remarks'] = ApiClient.convertToType(data['remarks'], 'String');
      }
    }
    return obj;
  }

  /**
   * @member {String} id
   */
  exports.prototype['id'] = undefined;
  /**
   * @member {String} itemGroupId
   */
  exports.prototype['itemGroupId'] = undefined;
  /**
   * @member {Number} quantity
   */
  exports.prototype['quantity'] = undefined;
  /**
   * @member {Number} delivered
   */
  exports.prototype['delivered'] = undefined;
  /**
   * @member {Date} startDate
   */
  exports.prototype['startDate'] = undefined;
  /**
   * @member {Date} endDate
   */
  exports.prototype['endDate'] = undefined;
  /**
   * @member {Date} signDate
   */
  exports.prototype['signDate'] = undefined;
  /**
   * @member {Date} termDate
   */
  exports.prototype['termDate'] = undefined;
  /**
   * @member {module:model/Contract.StatusEnum} status
   */
  exports.prototype['status'] = undefined;
  /**
   * @member {String} remarks
   */
  exports.prototype['remarks'] = undefined;


  /**
   * Allowed values for the <code>status</code> property.
   * @enum {String}
   * @readonly
   */
  exports.StatusEnum = {
    /**
     * value: "APPROVED"
     * @const
     */
    "APPROVED": "APPROVED",
    /**
     * value: "ON_HOLD"
     * @const
     */
    "ON_HOLD": "ON_HOLD",
    /**
     * value: "DRAFT"
     * @const
     */
    "DRAFT": "DRAFT",
    /**
     * value: "TERMINATED"
     * @const
     */
    "TERMINATED": "TERMINATED"  };


  return exports;
}));


/* jshint ignore:end */