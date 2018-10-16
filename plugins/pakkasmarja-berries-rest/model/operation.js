/* jshint ignore:start */
(function(root, factory) {
  module.exports = factory(require('../model-utils'));
}(this, function(ApiClient) {
  'use strict';
  const _ = require('lodash');




  /**
   * The Operation model module.
   * @module model/Operation
   * @version 0.0.3
   */

  /**
   * Constructs a new <code>Operation</code>.
   * @alias module:model/Operation
   * @class
   */
  var exports = function() {
    var _this = this;



  };

  /**
   * Constructs a <code>Operation</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/Operation} obj Optional instance to populate.
   * @return {module:model/Operation} The populated <code>Operation</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) {
      obj = obj || new exports();

      if (data.hasOwnProperty('type')) {
        obj['type'] = ApiClient.convertToType(data['type'], 'String');
      }
      if (data.hasOwnProperty('operationReportId')) {
        obj['operationReportId'] = ApiClient.convertToType(data['operationReportId'], 'String');
      }
    }
    return obj;
  }

  /**
   * @member {String} type
   */
  exports.prototype['type'] = undefined;
  /**
   * @member {String} operationReportId
   */
  exports.prototype['operationReportId'] = undefined;



  return exports;
}));


/* jshint ignore:end */