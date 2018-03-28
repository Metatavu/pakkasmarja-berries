/* jshint ignore:start */
(function(root, factory) {
  module.exports = factory(require('../model-utils'));
}(this, function(ApiClient) {
  'use strict';
  const _ = require('lodash');




  /**
   * The Contract model module.
   * @module model/Contract
   * @version 0.0.3
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
      if (data.hasOwnProperty('contactId')) {
        obj['contactId'] = ApiClient.convertToType(data['contactId'], 'String');
      }
      if (data.hasOwnProperty('deliveryPlaceId')) {
        obj['deliveryPlaceId'] = ApiClient.convertToType(data['deliveryPlaceId'], 'String');
      }
      if (data.hasOwnProperty('itemGroupId')) {
        obj['itemGroupId'] = ApiClient.convertToType(data['itemGroupId'], 'String');
      }
      if (data.hasOwnProperty('year')) {
        obj['year'] = ApiClient.convertToType(data['year'], 'Number');
      }
      if (data.hasOwnProperty('contractQuantity')) {
        obj['contractQuantity'] = ApiClient.convertToType(data['contractQuantity'], 'Number');
      }
      if (data.hasOwnProperty('deliveredQuantity')) {
        obj['deliveredQuantity'] = ApiClient.convertToType(data['deliveredQuantity'], 'Number');
      }
      if (data.hasOwnProperty('proposedQuantity')) {
        obj['proposedQuantity'] = ApiClient.convertToType(data['proposedQuantity'], 'Number');
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
   * @member {String} contactId
   */
  exports.prototype['contactId'] = undefined;
  /**
   * @member {String} deliveryPlaceId
   */
  exports.prototype['deliveryPlaceId'] = undefined;
  /**
   * @member {String} itemGroupId
   */
  exports.prototype['itemGroupId'] = undefined;
  /**
   * @member {Number} year
   */
  exports.prototype['year'] = undefined;
  /**
   * @member {Number} contractQuantity
   */
  exports.prototype['contractQuantity'] = undefined;
  /**
   * @member {Number} deliveredQuantity
   */
  exports.prototype['deliveredQuantity'] = undefined;
  /**
   * @member {Number} proposedQuantity
   */
  exports.prototype['proposedQuantity'] = undefined;
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