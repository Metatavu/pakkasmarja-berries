/* jshint ignore:start */
(function(root, factory) {
  module.exports = factory(require('../model-utils'));
}(this, function(ApiClient) {
  "use strict";
  const _ = require('lodash');




  /**
   * The OperationReport model module.
   * @module model/OperationReport
   * @version 0.0.3
   */

  /**
   * Constructs a new <code>OperationReport</code>.
   * @alias module:model/OperationReport
   * @class
   */
  var exports = function() {
    var _this = this;







  };

  /**
   * Constructs a <code>OperationReport</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/OperationReport} obj Optional instance to populate.
   * @return {module:model/OperationReport} The populated <code>OperationReport</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) {
      obj = obj || new exports();

      if (data.hasOwnProperty('id')) {
        obj['id'] = ApiClient.convertToType(data['id'], 'String');
      }
      if (data.hasOwnProperty('type')) {
        obj['type'] = ApiClient.convertToType(data['type'], 'String');
      }
      if (data.hasOwnProperty('started')) {
        obj['started'] = ApiClient.convertToType(data['started'], 'Date');
      }
      if (data.hasOwnProperty('pendingCount')) {
        obj['pendingCount'] = ApiClient.convertToType(data['pendingCount'], 'Number');
      }
      if (data.hasOwnProperty('failedCount')) {
        obj['failedCount'] = ApiClient.convertToType(data['failedCount'], 'Number');
      }
      if (data.hasOwnProperty('successCount')) {
        obj['successCount'] = ApiClient.convertToType(data['successCount'], 'Number');
      }
    }
    return obj;
  }

  /**
   * @member {String} id
   */
  exports.prototype['id'] = undefined;
  /**
   * @member {String} type
   */
  exports.prototype['type'] = undefined;
  /**
   * @member {Date} started
   */
  exports.prototype['started'] = undefined;
  /**
   * @member {Number} pendingCount
   */
  exports.prototype['pendingCount'] = undefined;
  /**
   * @member {Number} failedCount
   */
  exports.prototype['failedCount'] = undefined;
  /**
   * @member {Number} successCount
   */
  exports.prototype['successCount'] = undefined;



  return exports;
}));


/* jshint ignore:end */