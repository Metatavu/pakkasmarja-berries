import * as redis from "redis";
import * as Bluebird from "bluebird";

Bluebird.promisifyAll(redis);

/**
 * Redis storage for users
 */
export default class UserCache {

  private client: redis.RedisClient;
  private expireTime: number;

  /**
   * Constructor
   * 
   * @param {int} expireTime cache expire time in milliseconds
   */
  constructor(expireTime: number) {
    this.client = redis.createClient();
    this.expireTime = expireTime;
  }

  /**
   * Returns data for user id
   * 
   * @param {String} userId 
   * @returns {Promise} promise for data
   */
  async get(userId: string) {
    console.log("cache 1", userId);

    const value = await (this.client as any).getAsync(this.getKey(userId));
    console.log("cache 2", value);

    if (value) {
      console.log("cache 3");
      const result = JSON.parse(value);
      console.log("cache 4", result);
      const itemExpires = result.expires;
      console.log("cache 5", itemExpires);
      const now = (new Date()).getTime();
      console.log("cache 6", now);
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
  async set(userId: string, user: any) {
    const now = (new Date()).getTime();
    return await (this.client as any).setAsync(this.getKey(userId), JSON.stringify({
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
  async unset(userId: string) {   
    return await (this.client as any).delAsync(this.getKey(userId));
  }

  /**
   * Returns key for user id
   * 
   * @param {String} userId 
   * @returns key for user id
   */
  getKey(userId: string) {
    return `user-${userId}`;
  }

}