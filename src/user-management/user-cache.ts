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
    this.client.on("error", this.onClientError.bind(this));
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
      const getAsync = promisify(this.client.get).bind(this.client);
      const value = await getAsync(this.getKey(userId));

      if (value) {
        const result = JSON.parse(value);
        const itemExpires = result.expires;
        const now = (new Date()).getTime();
        console.log("cache 6", now, result);
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

  /**
   * Handles redis client errors
   * 
   * @param err error
   */
  private onClientError(err: any) {
    this.logger.error("Redis client error occurred", err);
  }

}