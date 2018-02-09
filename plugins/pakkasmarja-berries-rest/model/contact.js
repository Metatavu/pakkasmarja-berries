(function(root, factory) {
  module.exports = factory(require('../model-utils'));
}(this, function(ApiClient) {
  'use strict';




  /**
   * The Contact model module.
   * @module model/Contact
   * @version 0.0.1
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
      if (data.hasOwnProperty('status')) {
        obj['status'] = ApiClient.convertToType(data['status'], 'String');
      }
    }
    return obj;
  }

  /**
   * @member {String} id
   */
  exports.prototype['id'] = undefined;
  /**
   * @member {module:model/Contact.StatusEnum} status
   */
  exports.prototype['status'] = undefined;


  /**
   * Allowed values for the <code>status</code> property.
   * @enum {String}
   * @readonly
   */
  exports.StatusEnum = {
    /**
     * value: "approved"
     * @const
     */
    "approved": "approved",
    /**
     * value: "onhold"
     * @const
     */
    "onhold": "onhold",
    /**
     * value: "draft"
     * @const
     */
    "draft": "draft",
    /**
     * value: "terminated"
     * @const
     */
    "terminated": "terminated"  };


  return exports;
}));


