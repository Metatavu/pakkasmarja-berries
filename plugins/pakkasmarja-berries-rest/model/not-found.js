(function(root, factory) {
  module.exports = factory(require('../model-utils'));
}(this, function(ApiClient) {
  'use strict';




  /**
   * The NotFound model module.
   * @module model/NotFound
   * @version 0.0.1
   */

  /**
   * Constructs a new <code>NotFound</code>.
   * @alias module:model/NotFound
   * @class
   */
  var exports = function() {
    var _this = this;



  };

  /**
   * Constructs a <code>NotFound</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/NotFound} obj Optional instance to populate.
   * @return {module:model/NotFound} The populated <code>NotFound</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) {
      obj = obj || new exports();

      if (data.hasOwnProperty('code')) {
        obj['code'] = ApiClient.convertToType(data['code'], 'Number');
      }
      if (data.hasOwnProperty('message')) {
        obj['message'] = ApiClient.convertToType(data['message'], 'String');
      }
    }
    return obj;
  }

  /**
   * @member {Number} code
   */
  exports.prototype['code'] = undefined;
  /**
   * @member {String} message
   */
  exports.prototype['message'] = undefined;



  return exports;
}));


