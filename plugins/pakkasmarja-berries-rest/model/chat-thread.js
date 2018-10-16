/* jshint ignore:start */
(function(root, factory) {
  module.exports = factory(require('../model-utils'));
}(this, function(ApiClient) {
  'use strict';
  const _ = require('lodash');




  /**
   * The ChatThread model module.
   * @module model/ChatThread
   * @version 0.0.3
   */

  /**
   * Constructs a new <code>ChatThread</code>.
   * @alias module:model/ChatThread
   * @class
   * @param title {String} 
   * @param answerType {module:model/ChatThread.AnswerTypeEnum} 
   */
  var exports = function(title, answerType) {
    var _this = this;


    _this['title'] = title;



    _this['answerType'] = answerType;
  };

  /**
   * Constructs a <code>ChatThread</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/ChatThread} obj Optional instance to populate.
   * @return {module:model/ChatThread} The populated <code>ChatThread</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) {
      obj = obj || new exports();
      if (data.hasOwnProperty('id')) {
        obj['id'] = ApiClient.convertToType(data['id'], 'Number');
      }
      if (data.hasOwnProperty('title')) {
        obj['title'] = ApiClient.convertToType(data['title'], 'String');
      }
      if (data.hasOwnProperty('type')) {
        obj['type'] = ApiClient.convertToType(data['type'], 'String');
      }
      if (data.hasOwnProperty('originId')) {
        obj['originId'] = ApiClient.convertToType(data['originId'], 'String');
      }
      if (data.hasOwnProperty('imageUrl')) {
        obj['imageUrl'] = ApiClient.convertToType(data['imageUrl'], 'String');
      }
      if (data.hasOwnProperty('answerType')) {
        obj['answerType'] = ApiClient.convertToType(data['answerType'], 'String');
      }
    }
    return obj;
  }

  /**
   * @member {Number} id
   */
  exports.prototype['id'] = undefined;
  /**
   * @member {String} title
   */
  exports.prototype['title'] = undefined;
  /**
   * @member {String} type
   */
  exports.prototype['type'] = undefined;
  /**
   * @member {String} originId
   */
  exports.prototype['originId'] = undefined;
  /**
   * @member {String} imageUrl
   */
  exports.prototype['imageUrl'] = undefined;
  /**
   * @member {module:model/ChatThread.AnswerTypeEnum} answerType
   */
  exports.prototype['answerType'] = undefined;


  /**
   * Allowed values for the <code>answerType</code> property.
   * @enum {String}
   * @readonly
   */
  exports.AnswerTypeEnum = {
    /**
     * value: "TEXT"
     * @const
     */
    "TEXT": "TEXT",
    /**
     * value: "PREDEFINED"
     * @const
     */
    "PREDEFINED": "PREDEFINED"  };


  return exports;
}));


/* jshint ignore:end */