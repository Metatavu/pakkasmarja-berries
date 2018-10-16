/* jshint ignore:start */
(function(root, factory) {
  module.exports = factory(require('../model-utils'));
}(this, function(ApiClient) {
  'use strict';
  const _ = require('lodash');




  /**
   * The Credentials model module.
   * @module model/Credentials
   * @version 0.0.3
   */

  /**
   * Constructs a new <code>Credentials</code>.
   * @alias module:model/Credentials
   * @class
   */
  var exports = function() {
    var _this = this;


  };

  /**
   * Constructs a <code>Credentials</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/Credentials} obj Optional instance to populate.
   * @return {module:model/Credentials} The populated <code>Credentials</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) {
      obj = obj || new exports();

      if (data.hasOwnProperty('password')) {
        obj['password'] = ApiClient.convertToType(data['password'], 'String');
      }
    }
    return obj;
  }

  /**
   * @member {String} password
   */
  exports.prototype['password'] = undefined;



  return exports;
}));


/* jshint ignore:end */