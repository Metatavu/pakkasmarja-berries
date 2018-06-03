(() => {
  "use strict";

  const redis = require("redis");
  const bluebird = require("bluebird");
  
  bluebird.promisifyAll(redis);

  /**
   * Redis storage for users
   */
  class UserCache {

    /**
     * Constructor
     * 
     * @param {int} expireTime cache expire time in milliseconds
     */
    constructor(expireTime) {
      this.client = redis.createClient();
      this.expireTime = expireTime;
    }

    /**
     * Returns data for user id
     * 
     * @param {String} userId 
     * @returns {Promise} promise for data
     */
    async get(userId) {
      const value = await this.client.getAsync(this.getKey(userId));
      if (value) {
        const result = JSON.parse(value);
        const itemExpires = result.expires;
        const now = (new Date()).getTime();
        if (itemExpires > now) {
          return result.user;
        }
      }

      return null;
    }

    /**
     * Caches user
     * 
     * @param {String} userId 
     * @param {Object} user 
     * @returns {Promise} promise
     */
    set(userId, user) {
      const now = (new Date()).getTime();
      return this.client.setAsync(this.getKey(userId), JSON.stringify({
        user: user,
        expires: now + this.expireTime
      }));
    }

    /**
     * Unsets data from user id
     * 
     * @param {String} userId
     * @returns {Promise} promise
     */
    async unset(userId) {   
      return this.client.delAsync(this.getKey(userId));
    }

    /**
     * Returns key for user id
     * 
     * @param {String} userId 
     * @returns key for user id
     */
    getKey(userId) {
      return `user-${userId}`;
    }

  }

  module.exports = UserCache;

})();