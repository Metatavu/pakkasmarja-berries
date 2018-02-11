/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';

  /**
   * Utility class for generated model classes
   */
  class ModelUtils {

    /**
     * Converts a value to the specified type.
     * @param {(String|Object)} data The data to convert, as a string or object.
     * @param {(String|Array.<String>|Object.<String, Object>|Function)} type The type to return. Pass a string for simple types
     * or the constructor function for a complex type. Pass an array containing the type name to return an array of that type. To
     * return an object, pass an object with one property whose name is the key type and whose value is the corresponding value type:
     * all properties on <code>data<code> will be converted to this type.
     * @returns An instance of the specified type or null or undefined if data is null or undefined.
     */
    static convertToType (data, type) {
      if (data === null || data === undefined)
        return data;

      switch (type) {
        case 'Boolean':
          return Boolean(data);
        case 'Integer':
          return parseInt(data, 10);
        case 'Number':
          return parseFloat(data);
        case 'String':
          return String(data);
        case 'Date':
          return ModelUtils.parseDate(String(data));
        case 'Blob':
          return data;
        default:
          if (type === Object) {
            // generic object, return directly
            return data;
          } else if (typeof type === 'function') {
            // for model type like: User
            return type.constructFromObject(data);
          } else if (Array.isArray(type)) {
            // for array type like: ['String']
            var itemType = type[0];
            return (data||[]).map(function(item) {
              return ModelUtils.convertToType(item, itemType);
            });
          } else if (typeof type === 'object') {
            // for plain object type like: {'String': 'Integer'}
            var keyType, valueType;
            for (var k in type) {
              if (type.hasOwnProperty(k)) {
                keyType = k;
                valueType = type[k];
                break;
              }
            }
            var result = {};
            for (var k in data) {
              if (data.hasOwnProperty(k)) {
                var key = ModelUtils.convertToType(k, keyType);
                var value = ModelUtils.convertToType(data[k], valueType);
                result[key] = value;
              }
            }
            return result;
          } else {
            // for unknown type, return the data directly
            return data;
          }
      }
    }
    
    /**
     * Parses an ISO-8601 string representation of a date value.
     * @param {String} str The date value as a string.
     * @returns {Date} The parsed date object.
     */
    parseDate (str) {
      return new Date(str.replace(/T/i, ' '));
    }
   
  }

  module.exports = ModelUtils;

})();

