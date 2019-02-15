import * as redis from "redis";
import { promisify } from "util";
import { getLogger, Logger } from "log4js";

/**
 * Redis storage for users
 */
export default class UserCache {

  private logger: Logger;
  private client: redis.RedisClient;
  private expireTime: number;

  /**
   * Constructor
   * 
   * @param {int} expireTime cache expire time in milliseconds
   */
  constructor(expireTime: number) {
    this.logger = getLogger();
    this.client = redis.createClient();
    this.expireTime = expireTime;
  }

  /**
   * Returns data for user id
   * 
   * @param {String} userId 
   * @returns {Promise} promise for data
   */
  public async get(userId: string): Promise<any> {
    try {
      console.log("cache 1", userId);
      console.log("cache 1.1", this.client.get);
      const getAsync = promisify(this.client.get).bind(this.client);
      console.log("cache 1.1", getAsync);
      console.log("cache 1.2", this.getKey(userId));
      const value = await getAsync(this.getKey(userId));
      console.log("cache 2", value);

      if (value) {
        const result = JSON.parse(value);
        const itemExpires = result.expires;
        const now = (new Date()).getTime();
        console.log("cache 6", now);
        if (itemExpires > now) {
          return result.user;
        }
      }
    } catch (e) {
      this.logger.error("User cache retrieve failed", e);
    }

    console.log("cache 7");

    return null;
  }

  /**
   * Caches user
   * 
   * @param {String} userId 
   * @param {Object} user 
   * @returns {Promise} promise
   */
  public async set(userId: string, user: any): Promise<any> {
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
  public async unset(userId: string): Promise<any> {   
    const delAsync = promisify(this.client.del).bind(this.client);
    return await delAsync(this.getKey(userId));
  }

  /**
   * Returns key for user id
   * 
   * @param {String} userId 
   * @returns key for user id
   */
  private getKey(userId: string) {
    return `user-${userId}`;
  }

}