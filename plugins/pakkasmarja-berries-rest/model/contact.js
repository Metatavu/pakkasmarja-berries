/* jshint ignore:start */
(function(root, factory) {
  module.exports = factory(require('../model-utils'));
}(this, function(ApiClient) {
  "use strict";
  const _ = require('lodash');
  const Address = require(`${__dirname}/${_.kebabCase('Address')}`);




  /**
   * The Contact model module.
   * @module model/Contact
   * @version 0.0.3
   */

  /**
   * Constructs a new <code>Contact</code>.
   * @alias module:model/Contact
   * @class
   */
  var exports = function() {
    var _this = this;














  };

  /**
   * Constructs a <code>Contact</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/Contact} obj Optional instance to populate.
   * @return {module:model/Contact} The populated <code>Contact</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) {
      obj = obj || new exports();

      if (data.hasOwnProperty('id')) {
        obj['id'] = ApiClient.convertToType(data['id'], 'String');
      }
      if (data.hasOwnProperty('sapId')) {
        obj['sapId'] = ApiClient.convertToType(data['sapId'], 'String');
      }
      if (data.hasOwnProperty('firstName')) {
        obj['firstName'] = ApiClient.convertToType(data['firstName'], 'String');
      }
      if (data.hasOwnProperty('lastName')) {
        obj['lastName'] = ApiClient.convertToType(data['lastName'], 'String');
      }
      if (data.hasOwnProperty('companyName')) {
        obj['companyName'] = ApiClient.convertToType(data['companyName'], 'String');
      }
      if (data.hasOwnProperty('phoneNumbers')) {
        obj['phoneNumbers'] = ApiClient.convertToType(data['phoneNumbers'], ['String']);
      }
      if (data.hasOwnProperty('email')) {
        obj['email'] = ApiClient.convertToType(data['email'], 'String');
      }
      if (data.hasOwnProperty('addresses')) {
        obj['addresses'] = ApiClient.convertToType(data['addresses'], [Address]);
      }
      if (data.hasOwnProperty('BIC')) {
        obj['BIC'] = ApiClient.convertToType(data['BIC'], 'String');
      }
      if (data.hasOwnProperty('IBAN')) {
        obj['IBAN'] = ApiClient.convertToType(data['IBAN'], 'String');
      }
      if (data.hasOwnProperty('taxCode')) {
        obj['taxCode'] = ApiClient.convertToType(data['taxCode'], 'String');
      }
      if (data.hasOwnProperty('vatLiable')) {
        obj['vatLiable'] = ApiClient.convertToType(data['vatLiable'], 'String');
      }
      if (data.hasOwnProperty('audit')) {
        obj['audit'] = ApiClient.convertToType(data['audit'], 'String');
      }
    }
    return obj;
  }

  /**
   * @member {String} id
   */
  exports.prototype['id'] = undefined;
  /**
   * @member {String} sapId
   */
  exports.prototype['sapId'] = undefined;
  /**
   * @member {String} firstName
   */
  exports.prototype['firstName'] = undefined;
  /**
   * @member {String} lastName
   */
  exports.prototype['lastName'] = undefined;
  /**
   * @member {String} companyName
   */
  exports.prototype['companyName'] = undefined;
  /**
   * @member {Array.<String>} phoneNumbers
   */
  exports.prototype['phoneNumbers'] = undefined;
  /**
   * @member {String} email
   */
  exports.prototype['email'] = undefined;
  /**
   * @member {Array.<module:model/Address>} addresses
   */
  exports.prototype['addresses'] = undefined;
  /**
   * @member {String} BIC
   */
  exports.prototype['BIC'] = undefined;
  /**
   * @member {String} IBAN
   */
  exports.prototype['IBAN'] = undefined;
  /**
   * @member {String} taxCode
   */
  exports.prototype['taxCode'] = undefined;
  /**
   * @member {module:model/Contact.VatLiableEnum} vatLiable
   */
  exports.prototype['vatLiable'] = undefined;
  /**
   * @member {String} audit
   */
  exports.prototype['audit'] = undefined;


  /**
   * Allowed values for the <code>vatLiable</code> property.
   * @enum {String}
   * @readonly
   */
  exports.VatLiableEnum = {
    /**
     * value: "YES"
     * @const
     */
    "YES": "YES",
    /**
     * value: "NO"
     * @const
     */
    "NO": "NO",
    /**
     * value: "EU"
     * @const
     */
    "EU": "EU"  };


  return exports;
}));


/* jshint ignore:end */