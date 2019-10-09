import * as _ from "lodash";
import * as redis from "redis";
import { promisify } from "util";
import { getLogger, Logger } from "log4js";

/**
 * Redis storage for permissions
 */
export default class PermissionCache {

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
   * Returns data for permission id
   * 
   * @param {String} permissionId 
   * @returns {Promise} promise for data
   */
  public async get(resourceName: string, scopes: string[], userId: string): Promise<boolean | null> {
    try {
      const getAsync = promisify(this.client.get).bind(this.client);
      return await getAsync(this.getKey(resourceName, scopes, userId));
    } catch (e) {
      this.logger.error("Permission cache retrieve failed", e);
    }

    return null;
  }

  /**
   * Caches permission
   * 
   * @param {String} permissionId 
   * @param {Object} permission 
   * @returns {Promise} promise
   */
  public async set(resourceName: string, scopes: string[], userId: string, permission: boolean): Promise<void> {
    const setAsync = promisify(this.client.set).bind(this.client);
    return await setAsync(this.getKey(resourceName, scopes, userId), permission, "PX", this.expireTime);
  }

  /**
   * Unsets data from permission id
   * 
   * @param {String} permissionId
   * @returns {Promise} promise
   */
  public async unset(resourceName: string, scopes: string[], userId: string): Promise<any> {   
    const delAsync = promisify(this.client.del).bind(this.client);
    return await delAsync(this.getKey(resourceName, scopes, userId));
  }

  /**
   * Removes all cached entries from cache
   * 
   * @returns {Promise} promise for results
   */
  public async flush(): Promise<any[]> {   
    const keysAsync = promisify(this.client.keys).bind(this.client);
    const delAsync = promisify(this.client.del).bind(this.client);

    const keys: string[] = await keysAsync("permission-*");
    
    return await Promise.all(keys.map((key) => {
      return delAsync(key);
    }));
  }

  /**
   * Returns key for permission id
   * 
   * @param resourceName resource name
   * @param scopes scopes
   * @param userId userId
   * @returns key for permission id
   */
  private getKey(resourceName: string, scopes: string[], userId: string) {
    const scopeKey = _.sortBy(scopes).join(".");
    return `permission-${resourceName}-${scopeKey}-${userId}`;
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