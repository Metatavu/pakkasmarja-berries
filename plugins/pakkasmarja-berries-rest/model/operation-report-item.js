/* jshint ignore:start */
(function(root, factory) {
  module.exports = factory(require('../model-utils'));
}(this, function(ApiClient) {
  'use strict';
  const _ = require('lodash');




  /**
   * The OperationReportItem model module.
   * @module model/OperationReportItem
   * @version 0.0.3
   */

  /**
   * Constructs a new <code>OperationReportItem</code>.
   * @alias module:model/OperationReportItem
   * @class
   */
  var exports = function() {
    var _this = this;



  };

  /**
   * Constructs a <code>OperationReportItem</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/OperationReportItem} obj Optional instance to populate.
   * @return {module:model/OperationReportItem} The populated <code>OperationReportItem</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) {
      obj = obj || new exports();

      if (data.hasOwnProperty('status')) {
        obj['status'] = ApiClient.convertToType(data['status'], 'String');
      }
      if (data.hasOwnProperty('message')) {
        obj['message'] = ApiClient.convertToType(data['message'], 'String');
      }
    }
    return obj;
  }

  /**
   * @member {module:model/OperationReportItem.StatusEnum} status
   */
  exports.prototype['status'] = undefined;
  /**
   * @member {String} message
   */
  exports.prototype['message'] = undefined;


  /**
   * Allowed values for the <code>status</code> property.
   * @enum {String}
   * @readonly
   */
  exports.StatusEnum = {
    /**
     * value: "PENDING"
     * @const
     */
    "PENDING": "PENDING",
    /**
     * value: "FAILURE"
     * @const
     */
    "FAILURE": "FAILURE",
    /**
     * value: "SUCCESS"
     * @const
     */
    "SUCCESS": "SUCCESS"  };


  return exports;
}));


/* jshint ignore:end */