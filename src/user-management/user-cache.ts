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
    const value = await (this.client as any).getAsync(this.getKey(userId));
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