import * as _ from "lodash";
import * as crypto from "crypto";
import UserCache from "./user-cache";
import { config } from "../config";
import { UserRepresentation, GroupRepresentation } from "@keycloak-admin-client/models";
import { GroupsApi, UsersApi } from "@keycloak-admin-client/apis";
import { Configuration } from "@keycloak-admin-client/runtime";

export enum UserProperty {
  SAP_ID = "sapId",
  SAP_BUSINESS_PARTNER_CODE = "sapBusinessPartnerCode",
  SAP_SALES_PERSON_CODE = "sapSalesPersonCode",
  EQUIPMENT_INSPECTED = "equipmentInspected",
  COMPANY_NAME = "yritys",
  BIC = "BIC",
  IBAN = "IBAN",
  TAX_CODE = "verotunniste",
  VAT_LIABLE = "arvonlisäverovelvollisuus",
  AUDIT = "auditointi",
  PHONE_1 = "Puhelin 1",
  PHONE_2 = "Puhelin 2",
  POSTAL_CODE_1 = "Postinro",
  POSTAL_CODE_2 = "tilan postinro",
  STREET_1 = "Postiosoite",
  STREET_2 = "Tilan osoite",
  CITY_1 = "Kaupunki",
  CITY_2 = "Tilan kaupunki"
}

export default new class UserManagement {

  private userCache: UserCache | null;

  constructor () {
    this.userCache = config().cache.enabled ? new UserCache(config().cache["expire-time"]) : null;
  }

  /**
   * Finds single user from Keycloak.
   *
   * @param {String} id user id
   * @return {Promise} promise for a user or null if not found
   */
  public async findUser(id: string): Promise<UserRepresentation | null> {
    if (!id) {
      return null;
    }

    const cachedUser = this.userCache ? await this.userCache.get(id) : null;
    if (cachedUser) {
      return cachedUser;
    }

    const user = await this.findKeycloakUser(id);
    if (user && this.userCache) {
      await this.userCache.set(id, user);
    }

    return user;
  }

  /**
   * Finds user by attribute
   *
   * @param {String} name attribute name
   * @param {String} value attribute value
   */
  public async findUserByProperty(name: UserProperty, value: string | null): Promise<UserRepresentation | null> {
    if (value === null) {
      return null;
    }

    let page  = 0;
    let size = 25;
    const maxPages = 50;

    while (page < maxPages) {
      const result = await this.listUserByPropertyPaged(name, value, page * size, size);
      if (result.count === 0) {
        return null;
      } else {
        if (result.users.length === 1) {
          return result.users[0];
        } else if (result.users.length > 1) {
          throw new Error(`Found ${result.users.length} users with attribute ${name} === ${value}`);
        } else {
          page++;
        }
      }
    }

    throw new Error(`Max page count ${maxPages} exceeded`);
  }

  /**
   * Lists all users from Keycloak
   *
   * @return users
   */
  public async listAllUsers(): Promise<UserRepresentation[]> {
    let first = 0;
    const max = 50;
    let result: UserRepresentation[] = [];
    let paged: UserRepresentation[] = [];

    do {
      paged = await this.listUsers({
        first: first,
        max: max
      });

      result = result.concat(paged);

      first += max;
    } while (first < 1000 && paged.length >= max - 1);

    return result;
  }

  /**
   * Finds user by email
   *
   * @param email email address
   */
  public async findUserByEmail(email: string) {
    const users = await this.listUsers({ email: email });
    if (users.length === 1) {
      return users[0];
    } else if (users.length > 1) {
      throw new Error(`Found ${users.length} users with email ${email}`);
    } else {
      return null;
    }
  }

  /**
   * Lists users in specified page by property
   *
   * @param {String} name property name
   * @param {String} value  property value
   * @param {Integer} first first result
   * @param {Integer} maxResults maxResults
   */
  public async listUserByPropertyPaged(name: UserProperty, value: string, first: number, maxResults: number) {
    const users = await this.listUsers({
      first: first,
      max: maxResults
    });
    const count = users.length;
    return {
      count: count,
      users: users.filter((user) => {
        return this.getSingleAttribute(user, name) === value;
      })
    };
  }

  /**
   * Updates user into Keycloak
   *
   * @param user user object
   * @return promise that resolves on success and rejects on failure
   */
  public async updateUser(user: UserRepresentation): Promise<any> {
    const usersApi = this.getAdminUsersApi();
    const { realm } = config().keycloak.admin; 

    await usersApi.adminRealmsRealmUsersUserIdPut({
      realm: realm,
      userId: user.id!,
      userRepresentation: user
    });

    if (this.userCache) {
      await this.userCache.unset(user.id!);
    }

    return user;
  }

  /**
   * Updates user password into Keycloak
   *
   * @param userId User id of keycloak user
   * @param password New password for the user
   * @param temporary if password is temporary or not
   * @return promise that resolves on success and rejects on failure
   */
  public async resetUserPassword(userId: string, password: string, temporary: boolean) {
    const usersApi = this.getAdminUsersApi();
    const { realm } = config().keycloak.admin; 

    await usersApi.adminRealmsRealmUsersUserIdResetPasswordPut({
      realm: realm,
      userId: userId,
      credentialRepresentation: {
        temporary: temporary,
        value: password,
        type: "password"
      }
    });
  }

  /**
   * Lists users from Keycloak.
   *
   * @param {Object} options options (optional)
   * @return {Promise} promise for users
   */
  public async listUsers(options?: {
    search?: string,
    email?: string,
    first?: number,
    max?: number
  }): Promise<UserRepresentation[]> {
    const usersApi = this.getAdminUsersApi();
    const { realm } = config().keycloak.admin;
    const { search, first, max } = options || {};

    return await usersApi.adminRealmsRealmUsersGet({
      realm: realm,
      search: search,
      first: first,
      max: max
    });
  }

  /**
   * Find group from the Keycloak
   *
   * @param userGroupId user group id
   */
  public async findGroup(userGroupId: string): Promise<GroupRepresentation> {
    const groupsApi = this.getAdminGroupsApi();
    const { realm } = config().keycloak.admin;

    return await groupsApi.adminRealmsRealmGroupsGroupIdGet({
      realm: realm,
      groupId: userGroupId
    });
  }

  /**
   * Lists Groups from the Keycloak
   *
   * @param first first result index
   * @param max max results
   * @param search search string
   */
  public async listGroups(first?: number, max?: number, search?: string): Promise<GroupRepresentation[]> {
    const groupsApi = this.getAdminGroupsApi();
    const { realm } = config().keycloak.admin;

    return await groupsApi.adminRealmsRealmGroupsGet({
      realm: realm,
      first: first,
      max: max,
      search: search
    });
  }

  /**
   * Returns display name for an user
   *
   * @param user user
   * @returns display name for an user
   */
  public getUserDisplayName(user: UserRepresentation | null): string | null {
    if (!user) {
      return null;
    }

    const attributes: any = {};

    _.forEach(user.attributes||{}, (originalValue, key) => {
      const value = _.isArray(originalValue) ? originalValue.join("") : originalValue;
      attributes[String(key).toLowerCase()] = value;
    });

    if (attributes["näyttönimi"]) {
      return attributes["näyttönimi"];
    }

    const company = attributes.yritys;
    const name = user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName || user.lastName ;

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

  private isCompanyNameEqualToName(name: string, company: string) {
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

  /**
   * Returns image URL for an user
   *
   * @param user user
   * @return image URL for an user
   */
  public getUserImage(user: UserRepresentation) {
    const shasum = crypto.createHash("sha1");
    shasum.update((user.email || "").toLowerCase());
    const hash = shasum.digest("hex");
    return `https://www.gravatar.com/avatar/${hash}?d=identicon`;
  }

  isValidUserId(userId: string) {
    if (typeof userId === "string") {
      return !!userId.match(/[0-9a-zA-Z]{8}-[0-9a-zA-Z]{4}-[0-9a-zA-Z]{4}-[0-9a-zA-Z]{4}-[0-9a-zA-Z]{12}$/);
    }

    return false;
  }

  /**
   * Returns single user attribute
   *
   * @param {Object} user Keycloak user
   * @param {String[]} names attribute name or names
   * @return {String} attribute value or null if not found
   */
  public getSingleAttribute(user: any, names: UserProperty|UserProperty[]): string|null {
    let attributes = user.attributes || {};

    for (let [key, value] of Object.entries(attributes)) {
      if (!Array.isArray(value)) {
        attributes[key] = [value];
      }
    }

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
  public setSingleAttribute(user: any, name: UserProperty, value?: string|null) {
    if (!user.attributes) {
      user.attributes = {};
    }

    if (value) {
      user.attributes[name] = value;
    } else {
      delete user.attributes[name];
    }
  }

  /**
   * Find user from Keycloak
   *
   * @param id id
   * @return promise for user or null if not found
   */
  private async findKeycloakUser(id: string): Promise<UserRepresentation> {
    const usersApi = this.getAdminUsersApi();
    const { realm } = config().keycloak.admin;

    return await usersApi.adminRealmsRealmUsersUserIdGet({
      realm: realm,
      userId: id
    });
  }

  /**
   * Returns initalized admin groups api
   * 
   * @returns admin groups api
   */
  private getAdminGroupsApi = (): GroupsApi => {
    return new GroupsApi(this.getAdminApiConfiguration());
  }

  /**
   * Returns initalized admin users api
   * 
   * @returns admin users api
   */
  private getAdminUsersApi = () => {
    return new UsersApi(this.getAdminApiConfiguration());
  }

  /**
   * Returns admin api configuration
   * 
   * @returns admin api configuration
   */
  private getAdminApiConfiguration = () => {
    return new Configuration({
      username: config().keycloak.admin.username,
      password: config().keycloak.admin.password,
      basePath: config().keycloak.rest["auth-server-url"]
    }); 
  }

};
