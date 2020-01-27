import * as request from "request";
import * as config from "nconf";
import KcAdminClient from "keycloak-admin";
import { RoleMappingPayload } from "keycloak-admin/lib/defs/roleRepresentation";

config.file({ file: `${__dirname}/../../config.json` }).defaults(require(`${__dirname}/../../default-config.json`));

const keyclockSetup = require(`${__dirname}/../../scripts/kc-setup-for-tests.json`);

/**
 * Auth utility class for tests
 */
export default new (class Auth {
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
      request.post(
        {
          url: url,
          form: {
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: "password",
            username: username,
            password: password
          }
        },
        (err: any, httpResponse: any, body: string) => {
          if (err) {
            reject(err);
          } else {
            resolve(JSON.parse(body).access_token);
          }
        }
      );
    });
  }

  /**
   * Gets access token from keycloak
   *
   * @param {username} username
   * @param {password} password
   * @return {Promise} promise for results
   */
  public getToken(username: string, password: string) {
    return this.getClientToken(username, password, config.get("keycloak:app:resource"), config.get("keycloak:app:credentials:secret"));
  }

  /**
   * Gets access token from user with admin permissions
   *
   * @return {Promise} promise for results
   */
  public async getAdminToken(roles?: string | string[]) {
    if (roles) {
      const adminToken = await this.getAdminCliToken();
      const userId = this.getAdminId();
      await this.addRealmRolesToUser(adminToken, userId, Array.isArray(roles) ? roles : [roles]);
    }

    return this.getToken("admin", "test");
  }

  /**
   * Removes specified roles from admin
   *
   * @param {Array} roles list of roles to be removed
   * @returns {Promise} promise for removed roles
   */
  async removeAdminRoles(roles: string | string[]) {
    const adminToken = await this.getAdminCliToken();
    const userId = this.getAdminId();
    return this.removeRealmRolesToUser(adminToken, userId, Array.isArray(roles) ? roles : [roles]);
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
      await this.addRealmRolesToUser(adminToken, userId, Array.isArray(roles) ? roles : [roles]);
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
    return this.removeRealmRolesToUser(adminToken, userId, roles ? (Array.isArray(roles) ? roles : [roles]) : []);
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
      await this.addRealmRolesToUser(adminToken, userId, Array.isArray(roles) ? roles : [roles]);
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
    return this.removeRealmRolesToUser(adminToken, userId, Array.isArray(roles) ? roles : [roles]);
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
    return keyclockSetup.filter((realmSetup: any) => {
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
   * @param {String} adminToken admin token
   * @param {String} userId user id
   * @param {Array} roles array of roles to be added
   * @returns {Promise} promise for added roles
   */
  async addRealmRolesToUser(adminToken: string, userId: string, roles: string[]) {
    const client = await this.getClient();
    const realm = config.get("keycloak:app:realm");
    const roleMappings: RoleMappingPayload[] = roles.map((role: string) => {
      return { id: this.getRealmRoleId(role), name: role };
    });

    return client.users.addRealmRoleMappings({
      roles: roleMappings,
      id: userId,
      realm: realm
    });
  }

  /**
   * Removes realm roles to user
   *
   * @param {String} adminToken admin token
   * @param {String} userId user id
   * @param {Array} roles array of roles to be removed
   * @returns {Promise} promise for removed roles
   */
  async removeRealmRolesToUser(adminToken: string, userId: string, roles: string[]) {
    const client = await this.getClient();
    const realm = config.get("keycloak:app:realm");

    const roleMappings: RoleMappingPayload[] = roles.map((role: string) => {
      return { id: this.getRealmRoleId(role), name: role };
    });

    return client.users.delRealmRoleMappings({
      roles: roleMappings,
      id: userId,
      realm: realm
    });
  }

  /**
   * Creates roles for testing purposes
   *
   * @returns {Promise} promise for added roles
   */
  async createRoles() {
    const roles = [
      "list-all-contacts",
      "delete-week-delivery-predictions",
      "update-other-contacts",
      "update-other-week-delivery-predictions",
      "list-all-week-delivery-predictions",
      "create-contract",
      "list-all-contracts",
      "update-other-contracts",
      "create-contract-document-templates",
      "list-contract-document-templates",
      "update-contract-document-templates",
      "list-item-group-document-templates",
      "update-item-group-document-templates",
      "create-item-group-prices",
      "create-item-groups",
      "update-item-group-prices",
      "delete-item-group-prices",
      "list-operation-reports",
      "create-operations",
      "manage-product-prices",
      "create-item-group-prices",
      "update-item-group-prices",
      "manage-delivery-qualities"
    ];
    const client = await this.getClient();

    return Promise.all(
      roles.map(role => {
        return client.roles.create({
          name: role
        });
      })
    );
  }

  /**
   * Returns client
   *
   * @returns client
   */
  private async getClient(): Promise<KcAdminClient> {
    const client: KcAdminClient = new KcAdminClient();
    const keycloakConfig = config.get("keycloak:admin");

    await client.auth({
      username: keycloakConfig.username,
      password: keycloakConfig.password,
      grantType: keycloakConfig.grant_type,
      clientId: keycloakConfig.client_id,
      clientSecret: keycloakConfig.client_secret
    });

    return client;
  }
})();
