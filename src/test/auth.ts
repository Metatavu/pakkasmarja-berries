import { RolesApi, UsersApi, Configuration, ClientRoleMappingsApi, RoleMapperApi } from "../generated/keycloak-admin-client";
import config from "./config";
import * as request from "request";
import fetch from "node-fetch";

const keycloakSetup = require(`${__dirname}/../../scripts/kc-setup-for-tests.json`);

/**
 * Auth utility class for tests
 */
export default new class Auth {

  /**
   * Gets access token from keycloak
   *
   * @param username username
   * @param password password
   * @return promise for results
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
      }}, (err: any, _httpResponse: any, body: string) => {
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
  public async getAdminToken() {
    return this.getToken("admin", "admin");
  }

  /**
   * Removes specified roles from admin
   *
   * @param roles list of roles to be removed
   * @returns promise for removed roles
   */
  async removeAdminRoles(roles: string | string[]) {
    const userId = this.getAdminId();
    const adminToken = await this.getAdminCliToken();
    return this.removeRealmRolesToUser(adminToken, userId, Array.isArray(roles) ? roles : [roles]);
  }

  /**
   * Returns token for admin cli access
   *
   * @returns promise for token
   */
  public getAdminCliToken() {
    return this.getClientToken("admin", "admin", "admin-cli");
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
      await this.addRealmRolesToUser(adminToken, userId, Array.isArray(roles) ? roles : [roles]);
    }

    return this.getToken("test1-testrealm1", "test");
  }

  /**
   * Removes specified roles from user 1
   *
   * @param roles list of roles to be removed
   * @returns promise for removed roles
   */
  async removeUser1Roles(roles?: string | string[]) {
    const adminToken = await this.getAdminCliToken();
    const userId = this.getUser1Id();
    return this.removeRealmRolesToUser(adminToken, userId, roles ? Array.isArray(roles) ? roles : [roles] : []);
  }

  /**
   * Gets access token from keycloak with user2 username and password
   *
   * @return promise for results
   */
  async getTokenUser2(roles?: string | string[]) {
    if (roles) {
      const adminToken = await this.getAdminCliToken();
      const userId = this.getUser2Id();
      await this.addRealmRolesToUser(adminToken, userId, Array.isArray(roles) ? roles : [roles]);
    }

    return this.getToken("test2-testrealm1", "test");
  }

  /**
   * Removes specified roles from user 2
   *
   * @param roles list of roles to be removed
   * @returns promise for removed roles
   */
  async removeUser2Roles(roles: string | string[]) {
    const adminToken = await this.getAdminCliToken();
    const userId = this.getUser2Id();
    return this.removeRealmRolesToUser(adminToken, userId, Array.isArray(roles) ? roles : [roles]);
  }

  /**
   * Returns admin id
   *
   * @return user id
   */
  public getAdminId() {
    return "3feb85af-3ddb-4d3d-a97f-a879a32037a1";
  }

  /**
   * Returns user 1 id
   *
   * @return user id
   */
  public getUser1Id() {
    return "6f1cd486-107e-404c-a73f-50cc1fdabdd6";
  }

  /**
   * Returns user 2 id
   *
   * @return user id
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
  public async addRealmRolesToUser(adminToken: string, userId: string, roles: string[]) {
    const roleMapperApi = this.getRoleMapperApi(adminToken);

    await roleMapperApi.adminRealmsRealmUsersUserIdRoleMappingsRealmPost({
      realm: config.get("keycloak:app:realm"),
      userId: userId,
      roleRepresentation: roles.map((role: string) => {
        return { id: this.getRealmRoleId(role), name: role };
      })
    });
  }

  /**
   * Removes realm roles to user
   *
   * @param adminToken admin token
   * @param userId user id
   * @param roles array of roles to be removed
   * @returns promise for removed roles
   */
  public async removeRealmRolesToUser(adminToken: string, userId: string, roles: string[]) {
    const roleMapperApi = this.getRoleMapperApi(adminToken);
    const realm = config.get("keycloak:app:realm");

    await roleMapperApi.adminRealmsRealmUsersUserIdRoleMappingsRealmDelete({
      realm: realm,
      userId: userId,
      roleRepresentation: roles.map((role: string) => {
        return { id: this.getRealmRoleId(role), name: role };
      })
    });
  }

  /**
   * Creates roles for testing purposes
   *
   * @param adminToken admin token
   * @returns promise for added roles
   */
  async createRoles(adminToken: string) {
    const roles = ["list-all-contacts","delete-week-delivery-predictions","update-other-contacts","update-other-week-delivery-predictions","list-all-week-delivery-predictions","create-contract","list-all-contracts","update-other-contracts","create-contract-document-templates","list-contract-document-templates","update-contract-document-templates","list-item-group-document-templates","update-item-group-document-templates","create-item-group-prices","create-item-groups","update-item-group-prices","delete-item-group-prices","list-operation-reports","create-operations","manage-product-prices","create-item-group-prices","update-item-group-prices", "manage-delivery-qualities"];
    const rolesApi = this.getAdminRolesApi(adminToken);

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
   * Return initialized admin roles api
   * 
   * @param accessToken access token
   * @returns admin roles api
   */
  private getAdminRolesApi = (accessToken: string) => {
    return new RolesApi(this.getAdminApiConfiguration(accessToken));
  }

  /**
   * Return initialized admin users api
   * 
   * @param accessToken access token
   * @returns admin role mapper api
   */
  private getRoleMapperApi = (accessToken: string) => {
    return new RoleMapperApi(this.getAdminApiConfiguration(accessToken));
  }

  /**
   * Returns admin api configuration
   * 
   * @param accessToken access token
   * @returns admin api configuration
   */
  private getAdminApiConfiguration = (accessToken: string) => {
    const keycloakConfig = config.get("keycloak:admin");

    return new Configuration({
      basePath: keycloakConfig.baseUrl,
      username: keycloakConfig.username,
      password: keycloakConfig.password,
      accessToken: accessToken,
      fetchApi: fetch as any,
      headers: {
        "Authorization": `Bearer ${accessToken}`
      }
    }); 
  }

}