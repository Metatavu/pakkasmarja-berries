import * as redis from "redis";
import { promisify } from "util";

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

    const getAsync = promisify(this.client.get).bind(this.client);
    const value = await getAsync(this.getKey(userId));
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
    const setAsync = promisify(this.client.set).bind(this.client);
    return await setAsync(this.getKey(userId), JSON.stringify({
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
    const delAsync = promisify(this.client.del).bind(this.client);
    return await delAsync(this.getKey(userId));
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