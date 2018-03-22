/* jshint ignore:start */
(function(root, factory) {
  module.exports = factory(require('../model-utils'));
}(this, function(ApiClient) {
  'use strict';
  const _ = require('lodash');




  /**
   * The SignAuthenticationService model module.
   * @module model/SignAuthenticationService
   * @version 0.0.3
   */

  /**
   * Constructs a new <code>SignAuthenticationService</code>.
   * @alias module:model/SignAuthenticationService
   * @class
   */
  var exports = function() {
    var _this = this;




  };

  /**
   * Constructs a <code>SignAuthenticationService</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/SignAuthenticationService} obj Optional instance to populate.
   * @return {module:model/SignAuthenticationService} The populated <code>SignAuthenticationService</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) {
      obj = obj || new exports();

      if (data.hasOwnProperty('identifier')) {
        obj['identifier'] = ApiClient.convertToType(data['identifier'], 'String');
      }
      if (data.hasOwnProperty('name')) {
        obj['name'] = ApiClient.convertToType(data['name'], 'String');
      }
      if (data.hasOwnProperty('image')) {
        obj['image'] = ApiClient.convertToType(data['image'], 'String');
      }
    }
    return obj;
  }

  /**
   * @member {String} identifier
   */
  exports.prototype['identifier'] = undefined;
  /**
   * @member {String} name
   */
  exports.prototype['name'] = undefined;
  /**
   * @member {String} image
   */
  exports.prototype['image'] = undefined;



  return exports;
}));


/* jshint ignore:end */