import { RolesApi, UsersApi, Configuration } from "../generated/keycloak-admin-client";
import config from "./config";
import * as request from "request";

const keycloakSetup = require(`${__dirname}/../../scripts/kc-setup-for-tests.json`);

/**
 * Auth utility class for tests
 */
export default new class Auth {

  /**
   * Gets access token from keycloak
   *
   * @param {username} username
   * @param {password} password
   * @return {Promise} promise for results
   */
  public async getClientToken(username: string, password: string, clientId: string, clientSecret?: string): Promise<string> {
    const realm = config.get("keycloak:app:realm");
    const url = `${config.get("keycloak:app:auth-server-url")}/realms/${realm}/protocol/openid-connect/token`;

    return new Promise((resolve: (accessToken: string) => void, reject: (err: any) => void) => {
      request.post({ url: url, form: {
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "password",
        username: username,
        password: password
      }}, (err: any, httpResponse: any, body: string) => {
        if (err) {
          reject(err);
        } else {
          resolve(JSON.parse(body).access_token);
        }
      });
    });
  }

  /**
   * Gets access token from keycloak
   *
   * @param username
   * @param password
   * @return promise for results
   */
  public getToken(username: string, password: string) {
    return this.getClientToken(username, password, config.get("keycloak:app:resource"), config.get("keycloak:app:credentials:secret"));
  }

  /**
   * Gets access token from user with admin permissions
   *
   * @return promise for results
   */
  public async getAdminToken(roles?: string | string[]) {
    if (roles) {
      const userId = this.getAdminId();
      await this.addRealmRolesToUser(userId, Array.isArray(roles) ? roles : [roles]);
    }

    return this.getToken("admin", "test");
  }

  /**
   * Removes specified roles from admin
   *
   * @param roles list of roles to be removed
   * @returns promise for removed roles
   */
  async removeAdminRoles(roles: string | string[]) {
    const userId = this.getAdminId();
    return this.removeRealmRolesToUser(userId, Array.isArray(roles) ? roles : [roles]);
  }

  /**
   * Returns token for admin cli access
   *
   * @returns promise for token
   */
  public getAdminCliToken() {
    return this.getClientToken("admin", "test", "admin-cli");
  }

  /**
   * Gets access token from keycloak with user1 username and password
   *
   * @return {Promise} promise for results
   */
  public async getTokenUser1(roles?: string | string[]) {
    if (roles) {
      const adminToken = await this.getAdminCliToken();
      const userId = this.getUser1Id();
      await this.addRealmRolesToUser(userId, Array.isArray(roles) ? roles : [roles]);
    }

    return this.getToken("test1-testrealm1", "test");
  }

  /**
   * Removes specified roles from user 1
   *
   * @param {Array} roles list of roles to be removed
   * @returns {Promise} promise for removed roles
   */
  async removeUser1Roles(roles?: string | string[]) {
    const adminToken = await this.getAdminCliToken();
    const userId = this.getUser1Id();
    return this.removeRealmRolesToUser(userId, roles ? Array.isArray(roles) ? roles : [roles] : []);
  }

  /**
   * Gets access token from keycloak with user2 username and password
   *
   * @return {Promise} promise for results
   */
  async getTokenUser2(roles?: string | string[]) {
    if (roles) {
      const adminToken = await this.getAdminCliToken();
      const userId = this.getUser2Id();
      await this.addRealmRolesToUser(userId, Array.isArray(roles) ? roles : [roles]);
    }

    return this.getToken("test2-testrealm1", "test");
  }

  /**
   * Removes specified roles from user 2
   *
   * @param {Array} roles list of roles to be removed
   * @returns {Promise} promise for removed roles
   */
  async removeUser2Roles(roles: string | string[]) {
    const adminToken = await this.getAdminCliToken();
    const userId = this.getUser2Id();
    return this.removeRealmRolesToUser(userId, Array.isArray(roles) ? roles : [roles]);
  }

  /**
   * Returns admin id
   *
   * @return {String} user id
   */
  public getAdminId() {
    return "3feb85af-3ddb-4d3d-a97f-a879a32037a1";
  }

  /**
   * Returns user 1 id
   *
   * @return {String} user id
   */
  public getUser1Id() {
    return "6f1cd486-107e-404c-a73f-50cc1fdabdd6";
  }

  /**
   * Returns user 2 id
   *
   * @return {String} user id
   */
  public getUser2Id() {
    return "677e99fd-b854-479f-afa6-74f295052770";
  }

  /**
   * Returns setup for test realm
   */
  getRealmSetup() {
    return keycloakSetup.filter((realmSetup: any) => {
      return realmSetup.id === "pm";
    })[0];
  }

  /**
   * Returns role id for realm role
   *
   * @param {String} role role
   * @returns {String} role id for realm role
   */
  getRealmRoleId(role: string) {
    const realmRoles = this.getRealmSetup().roles.realm;
    for (let i = 0; i < realmRoles.length; i++) {
      if (realmRoles[i].name === role) {
        return realmRoles[i].id;
      }
    }
  }

  /**
   * Adds realm roles to user
   *
   * @param userId user id
   * @param roles array of roles to be added
   * @returns promise for added roles
   */
  public async addRealmRolesToUser(userId: string, roles: string[]) {
    const usersApi = this.getAdminUsersApi();
    const realm = config.get("keycloak:app:realm");

    const user = await usersApi.adminRealmsRealmUsersUserIdGet({
      realm: realm,
      userId: userId
    });

    const updatedUser = {
      ... user,
      realmRoles: Array.from(new Set((user.realmRoles || []).concat(roles)))
    };

    return usersApi.adminRealmsRealmUsersUserIdPut({
      realm: realm,
      userId: userId,
      userRepresentation: updatedUser
    });
  }

  /**
   * Removes realm roles to user
   *
   * @param userId user id
   * @param roles array of roles to be removed
   * @returns promise for removed roles
   */
  public async removeRealmRolesToUser(userId: string, roles: string[]) {
    const usersApi = this.getAdminUsersApi();
    const realm = config.get("keycloak:app:realm");

    const user = await usersApi.adminRealmsRealmUsersUserIdGet({
      realm: realm,
      userId: userId
    });

    const updatedUser = {
      ... user,
      realmRoles: (user.realmRoles || []).filter((role: string) => roles.indexOf(role) === -1)
    };

    return usersApi.adminRealmsRealmUsersUserIdPut({
      realm: realm,
      userId: userId,
      userRepresentation: updatedUser
    });
  }

  /**
   * Creates roles for testing purposes
   *
   * @returns promise for added roles
   */
  async createRoles() {
    const roles = ["list-all-contacts","delete-week-delivery-predictions","update-other-contacts","update-other-week-delivery-predictions","list-all-week-delivery-predictions","create-contract","list-all-contracts","update-other-contracts","create-contract-document-templates","list-contract-document-templates","update-contract-document-templates","list-item-group-document-templates","update-item-group-document-templates","create-item-group-prices","create-item-groups","update-item-group-prices","delete-item-group-prices","list-operation-reports","create-operations","manage-product-prices","create-item-group-prices","update-item-group-prices", "manage-delivery-qualities"];
    const rolesApi = this.getAdminRolesApi();

    return Promise.all(roles.map((role) => {
      return rolesApi.adminRealmsRealmRolesPost({
        realm: config.get("keycloak:app:realm"),
        roleRepresentation: {
          name: role
        }
      });
    }));
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
   * Return initialized admin roles api
   * 
   * @returns admin roles api
   */
  private getAdminRolesApi = () => {
    return new RolesApi(this.getAdminApiConfiguration());
  }

  /**
   * Returns admin api configuration
   * 
   * @returns admin api configuration
   */
  private getAdminApiConfiguration = () => {
    const keycloakConfig = config.get("keycloak:admin");

    return new Configuration({
      basePath: keycloakConfig.baseUrl,
      username: keycloakConfig.username,
      password: keycloakConfig.password
    }); 
  }

}