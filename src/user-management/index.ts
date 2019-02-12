import * as _ from "lodash";
import * as config from "nconf";
import * as crypto from "crypto";
import UserCache from "./user-cache";
import KeycloakAdminClient from "keycloak-admin-client";
import models from "../models";

export default new class UserManagement {

  private client: any;
  private userCache: UserCache|null;
  private requireFreshClient: boolean;
  
  constructor () {
    this.userCache = config.get("cache:enabled") ? new UserCache(config.get("cache:expire-time")) : null;
    this.client = null;
    this.requireFreshClient = true;
    setInterval(() => {
      this.requireFreshClient = true;
    }, 45 * 1000);
  }
  
  /**
   * Finds single user from Keycloak.
   * 
   * @param {String} id user id
   * @return {Promise} promise for a user or null if not found
   */
  async findUser(id: string) {
    const cachedUser = this.userCache ? await this.userCache.get(id) : null;
    if (cachedUser) {
      return cachedUser;
    }

    const client = await this.getClient(); 
    const user = await client.users.find(config.get("keycloak:admin:realm"), { userId: id });
    if (user && this.userCache) {
      return await this.userCache.set(id, user);
    }

    return null;
  }

  /**
   * Finds user by attribute
   * 
   * @param {String} name attribute name 
   * @param {String} value attribute value 
   */
  findUserByProperty(name: string, value: string): Promise<any> {
    let page  = 0;
    let size = 25;
    const maxPages = 50;

    return new Promise(async (resolve, reject) => {
      try {
        while (page < maxPages) {
          const result = await this.listUserByPropertyPaged(name, value, page * size, size);
          if (result.count === 0) {
            resolve(null);
            return;
          } else {
            if (result.users.length === 1) {
              resolve(result.users[0]);
              return;
            } else if (result.users.length > 1) {
              reject(`Found ${result.users.length} users with attribute ${name} === ${value}`);
              return;
            } else {
              page++; 
            }
          }
        }

        reject(`Max page count ${maxPages} exceeded`);
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * Finds user by email
   * 
   * @param {String} email email address 
   */
  findUserByEmail(email: string) {
    return this.listUsers({ email: email })
      .then((users: any[]) => {
        if (users.length === 1) {
          return users[0];
        } else if (users.length > 1) {
          throw new Error(`Found ${users.length} users with email ${email}`);
        } else {
          return null;
        }
      });
  }

  /**
   * Lists users in specified page by property  
   * 
   * @param {String} name propery name
   * @param {String} value  property value
   * @param {Integer} first first result
   * @param {Integer} maxResults maxResults
   */
  listUserByPropertyPaged(name: string, value: string, first: number, maxResults: number) {
    return this.listUsers({
      first: first,
      max: maxResults
    })
      .then((users: any[]) => {
        const count = users.length;
        return {
          count: count,
          users: users.filter((user) => {
            return this.getSingleAttribute(user, name) === value;
          })
        };
      });
  }

  /**
   * Updates user into Keycloak
   * 
   * @param {Object} user user object
   * @return {Promise} promise that resolves on success and rejects on failure
   */
  async updateUser(user: any) {
    const client = await this.getClient();
    const result = await client.users.update(config.get("keycloak:admin:realm"), user);
    if (this.userCache) {
      await this.userCache.unset(user.id);
    }

    return result;
  }
  
  /**
   * Updates user password into Keycloak
   * 
   * @param {string} userId User id of keycloak user
   * @param {string} password New password for the user
   * @param {boolean} temporary if passoword is temporary or not
   * @return {Promise} promise that resolves on success and rejects on failure
   */
  resetUserPassword(userId: string, password: string, temporary: boolean) {
    return this.getClient().then((client: any) => {
      const keycloakRealm = config.get("keycloak:admin:realm");
      return client.users.resetPassword(keycloakRealm, userId, { temporary: temporary , value: password });
    });
  }
  
  /**
   * Lists users from Keycloak. 
   * 
   * @param {Object} options options (optional)
   * @return {Promise} promise for users
   */
  listUsers(options?: any) {
    return this.getClient().then((client: any) => {
      return client.users.find(config.get("keycloak:admin:realm"), options);
    });
  }
  
  listUserGroupIds(realm: string, userId: string): Promise<number[]> {
    return new Promise((resolve, reject) => {
      this.listUserGroups(realm, userId)
        .then((userGroup: any) => {
          resolve(_.uniq(_.map(userGroup, "id")));
        })
        .catch(reject);
    });
  }
  
  listUserGroups(realm: string, userId: string) {
    return new Promise((resolve, reject) => {
      this.getClient()
        .then((client: any) => {
          client.users.groups.find(realm, userId)
            .then(resolve)
            .catch(reject);
        })
        .catch(reject);
    });
  }
  
  /**
   * Lists Groups from the Keycloak
   */
  listGroups() {
    return this.getClient().then((client: any) => {
      return client.groups.find(config.get("keycloak:admin:realm"));
    });
  }
  
  listGroupsMemberIds(realm: string, groupIds: string[]) {     
    return new Promise((resolve, reject) => {
      this.listGroupsMembers(realm, groupIds)
        .then((members: any[]) => {
          resolve(_.uniq(_.map(members, "id")));
        })
        .catch(reject);
    });
  }
  
  listGroupsMembers(realm: string, groupIds: string[]) {
    return new Promise((resolve, reject) => {
      const promises = _.map(groupIds, (groupId) => {
        return this.listGroupMembers(realm, groupId);
      });

      Promise.all(promises)
        .then((results) => {
          resolve(_.compact(_.flatten(results)));
        })
        .catch(reject);
    });
  }
  
  listGroupMembers(realm: string, groupId: string) {
    return new Promise((resolve) => {
      this.getClient()
        .then((client: any) => {
          client.groups.members.find(realm, groupId)
            .then(resolve)
            .catch((err: Error) => {
              resolve([]);
            });
        })
        .catch();
    });
  }
  
  getUserMap(userIds: string[]) {
    return new Promise((resolve, reject) => {
      const userPromises = _.map(userIds, (userId) => {
        return this.findUser(userId);
      });

      Promise.all(userPromises)
        .then((users) => {
          const result = {};
  
          users.forEach((user) => {
            if (user) {
              result[user.id] = user; 
            }
          });
          
          resolve(result);
        })
        .catch(reject);
    });
  }
  
  getUserDisplayName(user: any) {
    const attributes: any = {};

    _.forEach(user.attributes||{}, (originalValue, key) => {
      const value = _.isArray(originalValue) ? originalValue.join("") : originalValue;
      attributes[String(key).toLowerCase()] = value;
    });
    
    if (attributes["näyttönimi"]) {
      return attributes["näyttönimi"];
    }
    
    const company = attributes.yritys;
    const name = user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName || user.lastName ;
    
    if (company && name) {
      return this.isCompanyNameEqualToName(name, company) ? name : `${name} ${company}`;
    }
    
    if (company) {
      return company;
    }
    
    if (name) {
      return name;
    }
    
    return `<${user.email}>`;
  }
  
  isCompanyNameEqualToName(name: string, company: string) {
    if (!(company && name)) {
      return false;
    }

    if (name.length !== company.length) {
      return false;
    }

    const nameparts = name.split(" ");
    for(let i = 0; i < nameparts.length;i++) {
      if(company.indexOf(nameparts[i]) < 0) {
        return false;
      }
    }
    
    return true;
  }
  
  getUserImage(user: any) {
    const shasum = crypto.createHash("sha1");
    shasum.update(user.email.toLowerCase());
    const hash = shasum.digest("hex");
    return `https://www.gravatar.com/avatar/${hash}?d=identicon`;
  }
  
  getThreadUserRole(realm: string, threadId: number, userId: string) {
    return models.getThreadUserGroupRoleMap(threadId)
      .then((userGroupRoleMap: any) => {
        return this.listUserGroupIds(realm, userId)
          .then((userGroupIds) => {
            return this.getUserGroupRole(userGroupRoleMap, userGroupIds);
          });
      });
  }
  
  getQuestionGroupUserRole(realm: string, questionGroupId: number, userId: string) {
    return models.getQuestionGroupUserGroupRoleMap(questionGroupId)
      .then((userGroupRoleMap: any) => {
        return this.listUserGroupIds(realm, userId)
          .then((userGroupIds) => {
            return this.getUserGroupRole(userGroupRoleMap, userGroupIds);
          });
      });
  }
  
  getUserGroupRole(userGroupRoleMap: any, userGroupIds: number[]) {
    let result: any = null;
    
    userGroupIds.forEach((userGroupId) => {
      const role = userGroupRoleMap[userGroupId];
      if (this.getRoleIndex(role) > this.getRoleIndex(result)) {
        result = role; 
      }
    });
    
    return result;
  }
  
  getRoleIndex(role: string) {
    if (role === "manager") {
      return 2;
    } else if (role === "user") {
      return 1;
    }
    
    return 0;
  }
  
  getThreadUserIds(realm: string, threadId: number) {
    return models.listThreadUserGroupIds(threadId)
      .then((threadUserGroupIds) => {
        return this.listGroupsMemberIds(realm, threadUserGroupIds);
      });
  }
  
  getQuestionGroupUserIds(realm: string, questionGroupId: number) {
    return models.listQuestionGroupUserGroupIds(questionGroupId)
      .then((questionGroupUserGroupIds) => {
        return this.listGroupsMemberIds(realm, questionGroupUserGroupIds);
      });
  }
  
  isValidUserId(userId: string) {
    if (typeof userId === "string") {
      return !!userId.match(/[0-9a-zA-Z]{8}-[0-9a-zA-Z]{4}-[0-9a-zA-Z]{4}-[0-9a-zA-Z]{4}-[0-9a-zA-Z]{12}$/);
    }
    
    return false;
  }
  
  checkPermissionToPostThread(realm: string, userId: string, threadId: number) {
    return this.getThreadUserIds(realm, threadId)
      .then((threadUserIds: string[]) => {
        return _.indexOf(threadUserIds||[], userId) >= 0;
      });
  }
  
  checkPermissionToReadThread(realm: string, userId: string, threadId: number) {
    return this.checkPermissionToPostThread(realm, userId, threadId);
  }
  
  checkPermissionToReadMessage(realm: string, userId: string, messageId: number) {
    return models.findMessage(messageId)
      .then((message) => {
        if (message) {
          return this.checkPermissionToReadThread(realm, userId, message.threadId);
        } else {
          return false;
        }
      });
  }
  
  checkPermissionToListQuestionGroupThreads(realm: string, userId: string, questionGroupId: number) {
    return this.getQuestionGroupUserIds(realm, questionGroupId)
      .then((threadUserIds: string[]) => {
        return _.indexOf(threadUserIds||[], userId) >= 0;
      });
  }
  
  checkPermissionToDeleteMessages(realm: string, userId: string, messageId: number) {
    return new Promise((resolve, reject) => {
      this.getClient()
        .then((client: any) => {
          client.users.roleMappings.find(realm, userId)
            .then((userRoleMappings: any) => {
              let hasManagerRole = false;
              if (userRoleMappings && userRoleMappings.realmMappings) {
                const realmRoles = userRoleMappings.realmMappings;
                for (let i = 0; i < realmRoles.length; i++) {
                  if (realmRoles[i].name === "app-manager") {
                    hasManagerRole = true;
                    break;
                  }
                }
              }
              resolve(hasManagerRole);
          })
          .catch(reject);
        })
        .catch(reject);
    });
  }
  
  /**
   * Returns single user attribute
   * 
   * @param {Object} user Keycloak user
   * @param {String[]} names attribute name or names
   * @return {String} attribute value or null if not found
   */
  getSingleAttribute(user: any, names: string|string[]): string|null {
    const attributes = user.attributes || {};
    const nameAttr = _.isArray(names) ? names : [ names ];
    for (let i = 0; i < nameAttr.length; i++) {
      const name = nameAttr[i];        
      const values: string[] = _.isArray(attributes[name]) ? _.compact(attributes[name]) : [];

      if (values.length === 1) {
        return values[0];
      }
    }
    
    return null;
  }
  
  /**
   * Sets single user attribute
   * 
   * @param {Object} user Keycloak user
   * @param {String} name name of the attribute
   * @param {String} value value
   */
  setSingleAttribute(user: any, name: string, value?: string|null) {
    if (!user.attributes) {
      user.attributes = {};
    }
    
    if (value) {
      user.attributes[name] = value;
    } else {
      delete user.attributes[name];
    }
  }
  
  getClient() {
    if (!this.client || this.requireFreshClient) {
      this.client = KeycloakAdminClient(config.get("keycloak:admin"));
      this.requireFreshClient = false;
      console.log("[Usermanagement] getting fresh keycloak client...");
    }
    
    return this.client;
  }
  
  get ATTRIBUTE_SAP_ID() {
    return "sapId";
  }
  
  get ATTRIBUTE_COMPANY_NAME() {
    return "yritys";
  }
  
  get ATTRIBUTE_BIC() {
    return "BIC";
  }
  
  get ATTRIBUTE_IBAN() {
    return "IBAN";
  }
  
  get ATTRIBUTE_TAX_CODE() {
    return "verotunniste";
  }
  
  get ATTRIBUTE_VAT_LIABLE() {
    return "arvonlisäverovelvollisuus";
  }
  
  get ATTRIBUTE_AUDIT() {
    return "auditointi";
  }
  
  get ATTRIBUTE_PHONE_1() {
    return "Puhelin 1";
  }
  
  get ATTRIBUTE_PHONE_2() {
    return "Puhelin 2";
  }
  
  get ATTRIBUTE_POSTAL_CODE_1() {
    return "Postinro";
  }
  
  get ATTRIBUTE_POSTAL_CODE_2() {
    return "tilan postinro";
  }
  
  get ATTRIBUTE_STREET_1() {
    return "Postiosoite";
  }
  
  get ATTRIBUTE_STREET_2() {
    return "Tilan osoite";
  }
  
  get ATTRIBUTE_CITY_1() {
    return "Kaupunki";
  }
  
  get ATTRIBUTE_CITY_2() {
    return "Tilan kaupunki";
  }
  
};
