import * as _ from "lodash";
import * as crypto from "crypto";
import UserCache from "./user-cache";
import KcAdminClient from "keycloak-admin";
import { config } from "../config";
import UserRepresentation from "keycloak-admin/lib/defs/userRepresentation";
import PolicyRepresentation, { Logic, DecisionStrategy } from "keycloak-admin/lib/defs/policyRepresentation";
import GroupPolicyRepresentation from "keycloak-admin/lib/defs/groupPolicyRepresentation";
import GroupRepresentation from "keycloak-admin/lib/defs/groupRepresentation";
import { UserQuery } from "keycloak-admin/lib/resources/users";
import CredentialRepresentation from "keycloak-admin/lib/defs/credentialRepresentation";
import ResourceRepresentation from "keycloak-admin/lib/defs/resourceRepresentation";
import UserPolicyRepresentation from "keycloak-admin/lib/defs/userPolicyRepresentation";
import { URLSearchParams }  from "url";
import fetch from "node-fetch";
import RolePolicyRepresentation from "keycloak-admin/lib/defs/rolePolicyRepresentation";
import RoleDefinition from "keycloak-admin/lib/defs/roleDefinition";
import RoleRepresentation from "keycloak-admin/lib/defs/roleRepresentation";
import { Promise } from "bluebird";
import * as jwt_decode from "jwt-decode";
import PermissionCache from "./permission-cache";

export enum UserProperty {
  SAP_ID = "sapId",
  SAP_SALES_PERSON_CODE = "sapSalesPersonCode",
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

interface PolicyResolveResult {
  groupPolicyNames: string[];
  userPolicyNames: string[];
  rolePolicyNames: string[];
}

export default new class UserManagement {

  private client: any;
  private permissionCache: PermissionCache | null;
  private userCache: UserCache | null;
  private requireFreshClient: boolean;
  private restClientInternalId: string;
  
  constructor () {
    this.userCache = config().cache.enabled ? new UserCache(config().cache["expire-time"]) : null;
    this.permissionCache = config().cache.enabled ? new PermissionCache(6 * 1000 * 60 * 60) : null;

    this.client = new KcAdminClient({
      baseUrl: config().keycloak.rest["auth-server-url"]
    });
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
  public async findUser(id: string): Promise<UserRepresentation | null> {
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
   * @param {String} name property name
   * @param {String} value  property value
   * @param {Integer} first first result
   * @param {Integer} maxResults maxResults
   */
  public listUserByPropertyPaged(name: UserProperty, value: string, first: number, maxResults: number) {
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
   * @param {UserRepresentation} user user object
   * @return {Promise} promise that resolves on success and rejects on failure
   */
  public async updateUser(user: UserRepresentation ) {
    const client = await this.getClient();
    await client.users.update({
      id: user.id!,
      realm: config().keycloak.admin.realm
    }, user);

    if (this.userCache) {
      await this.userCache.unset(user.id!);
    }
    
    return user;
  }
  
  /**
   * Updates user password into Keycloak
   * 
   * @param {string} userId User id of keycloak user
   * @param {string} password New password for the user
   * @param {boolean} temporary if password is temporary or not
   * @return {Promise} promise that resolves on success and rejects on failure
   */
  public async resetUserPassword(userId: string, password: string, temporary: boolean) {
    const client = await this.getClient();
    const credential: CredentialRepresentation = {
      temporary: temporary,
      value: password,
      type: "password"
    };

    return client.users.resetPassword({
      id: userId,
      credential: credential,
      realm: config().keycloak.admin.realm
    });
  }
  
  /**
   * Lists users from Keycloak. 
   * 
   * @param {Object} options options (optional)
   * @return {Promise} promise for users
   */
  public async listUsers(options?: UserQuery): Promise<UserRepresentation[]> {
    const client = await this.getClient();
    return client.users.find(Object.assign({}, options, {
      realm: config().keycloak.admin.realm
    }));
  }
  
  /**
   * Find group from the Keycloak
   * 
   * @param userGroupId user group id
   */
  public async findGroup(userGroupId: string): Promise<GroupRepresentation> {
    const client = await this.getClient();
    return client.groups.findOne({
      realm: config().keycloak.admin.realm,
      id: userGroupId
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
    const client = await this.getClient();
    return client.groups.find({
      realm: config().keycloak.admin.realm,
      first: first,
      max: max,
      search: search
    });
  }

  /**
   * Finds authz resource by URI
   * 
   * @param uri URI
   * @return Promise for found resource or null if not found
   */
  public async findResourceByUri(uri: string): Promise<ResourceRepresentation | null> {
    const client = await this.getClient();
    const results = await client.clients.listAuthzResources({
      id: await this.getRestClientInternalId(),
      realm: config().keycloak.admin.realm,
      uri: uri,
      max: 1
    });

    return results.length ? results[0] : null;
  }

  /**
   * Creates authz resource
   * 
   * @param name name
   * @param displayName display name
   * @param uri URI
   * @param type type
   * @return Promise created resource
   */
  public async createResource(name: string, displayName: string, uri: string, type: string, scopes: string[]) {
    const client = await this.getClient();
    const resource: ResourceRepresentation = {
      name: name,
      displayName: displayName,
      type: type,
      uri: uri,
      scopes: scopes.map((scopeName) => {
        return {
          name: scopeName
        };
      }),
      attributes: {}
    };

    return client.clients.createAuthzResource({
      id: await this.getRestClientInternalId(),
      realm: config().keycloak.admin.realm,
      resource: resource
    }) as any;
  }

  /**
   * Finds authz group policy by name
   * 
   * @param name name
   * @return Promise for found policy or null if not found
   */
  public async findGroupPolicyByName(name: string): Promise<GroupPolicyRepresentation | null> {
    const client = await this.getClient();
    const results = await client.clients.listAuthzGroupPolicies({
      id: await this.getRestClientInternalId(),
      realm: config().keycloak.admin.realm,
      name: name,
      max: 1
    });

    return results.length ? results[0] : null;
  }

  /**
   * Lists all role policies for the realm
   * 
   * @returns list of role policies
   */
  public async listRolePolicies(): Promise<RolePolicyRepresentation[]> {
    const client = await this.getClient();
    const results = await client.clients.listAuthzRolePolicies({
      id: await this.getRestClientInternalId(),
      realm: config().keycloak.admin.realm
    });

    return results || [];
  }

  /**
   * Finds authz group policy by name
   * 
   * @param name name
   * @return Promise for found policy or null if not found
   */
  public async findRolePolicyByName(name: string) {
    const client = await this.getClient();
    const results = await client.clients.listAuthzRolePolicies({
      id: await this.getRestClientInternalId(),
      realm: config().keycloak.admin.realm,
      name: name,
      max: 1
    });

    return results.length ? results[0] : null;
  }

  /**
   * Finds role by name
   * 
   * @param name name
   * @return Promise for found role or null if not found
   */
  public async findRealmRole(name: string): Promise<RoleRepresentation | undefined> {
    const client = await this.getClient();

    const roles = await client.roles.find({
      realm: config().keycloak.admin.realm
    } as any);
    
    return roles.find((role) => {
      return role.name == name;
    });
  }

  /**
   * Creates new realm role
   * 
   * @param name name
   * @return Promise for created role
   */
  public async createRealmRole(name: string): Promise<RoleRepresentation | undefined> {
    const client = await this.getClient();
    
    await client.roles.create({
      name: name,
      realm: config().keycloak.admin.realm
    });

    return this.findRealmRole(name);
  }

  /**
   * Finds authz group policy by name
   * 
   * @param name name
   * @return Promise for found policy or null if not found
   */
  public async findUserPolicyByName(name: string) {
    const client = await this.getClient();
    const results = await client.clients.listAuthzUserPolicies({
      id: await this.getRestClientInternalId(),
      realm: config().keycloak.admin.realm,
      name: name,
      max: 1
    });

    return results.length ? results[0] : null;
  }

  /**
   * Creates authz group policy
   * 
   * @param name name
   * @param groupIds group ids
   * @return Promise created policy
   */
  public async createGroupPolicy(name: string, groupIds: string[]): Promise<GroupPolicyRepresentation> {
    const client = await this.getClient();
    const policy: GroupPolicyRepresentation = {
      name: name,
      logic: Logic.POSITIVE,
      groups: groupIds.map((groupId) => {
        const result: GroupRepresentation = {
          id: groupId
        }

        return result;
      })
    };

    return client.clients.createAuthzGroupPolicy({
      id: await this.getRestClientInternalId(),
      realm: config().keycloak.admin.realm,
      policy: policy
    });
  }

  /**
   * Creates authz role policy
   * 
   * @param name name
   * @param roleIds role ids
   * @return Promise created policy
   */
  public async createRolePolicy(name: string, roleIds: string[]): Promise<GroupPolicyRepresentation> {
    const client = await this.getClient();
    const policy: RolePolicyRepresentation = {
      name: name,
      logic: Logic.POSITIVE,
      roles: roleIds.map((roleId) => {
        const result: RoleDefinition = {
          id: roleId,
          required: true
        }

        return result;
      })
    };

    return client.clients.createAuthzRolePolicy({
      id: await this.getRestClientInternalId(),
      realm: config().keycloak.admin.realm,
      policy: policy
    });
  }

  /**
   * Creates authz group policy
   * 
   * @param name name
   * @param userIds user ids
   * @return Promise created policy
   */
  public async createUserPolicy(name: string, userIds: string[]): Promise<UserPolicyRepresentation> {
    const client = await this.getClient();
    const policy: UserPolicyRepresentation = {
      name: name,
      logic: Logic.POSITIVE,
      users: userIds,
      type: "user",
      decisionStrategy: DecisionStrategy.UNANIMOUS
    };

    return await client.clients.createAuthzUserPolicy({
      id: await this.getRestClientInternalId(),
      realm: config().keycloak.admin.realm,
      policy: policy
    });
  }

  /**
   * Finds authz permissions by names
   * 
   * @param names names
   * @return Promise for found permissions
   */
  public async findPermissionsByNames(names: string[]): Promise<PolicyRepresentation[]> {
    const permissionPromises: Promise<PolicyRepresentation | null>[] = names.map((name: string) => {
      return this.findPermissionByName(name);
    });

    return await Promise.all(Promise.filter(permissionPromises, (permission) => !!permission)) as PolicyRepresentation[];
  }

  /**
   * Finds authz permission by name
   * 
   * @param name name
   * @return Promise for found permission or null if not found
   */
  public async findPermissionByName(name: string): Promise<PolicyRepresentation | null> {
    const client = await this.getClient();
    const results = await client.clients.listAuthzPermissions({
      id: await this.getRestClientInternalId(),
      realm: config().keycloak.admin.realm,
      name: name,
      max: 1
    });

    return results.length ? results[0] : null;
  }

  /**
   * Creates authz scope permission
   * 
   * @param name name
   * @param resourceIds resource ids
   * @param scopes scopes
   * @param policyIds policy ids
   * @return Promise created permission
   */
  public async createScopePermission(name: string, resourceIds: string[], scopes: string[], policyIds: string[], decisionStrategy: DecisionStrategy) {
    const client = await this.getClient();
    const permission: PolicyRepresentation = {
      "type":"scope",
      "logic": Logic.POSITIVE,
      "decisionStrategy": decisionStrategy,
      "name": name,
      "resources": resourceIds,
      "scopes": scopes,
      "policies": policyIds
    };

    return client.clients.createAuthzScopePermission({
      id: await this.getRestClientInternalId(),
      realm: config().keycloak.admin.realm,
      permission: permission
    });
  }

  /**
   * Creates authz scope permission
   * 
   * @param permissionId permission id
   * @param permission new permission
   * @return Promise updated permission
   */
  public async updateScopePermission(permissionId: string, permission: PolicyRepresentation) {
    const client = await this.getClient();

    const result = await client.clients.updateAuthzScopePermission({
      id: await this.getRestClientInternalId(),
      realm: config().keycloak.admin.realm,
      permission: permission,
      permissionId: permissionId
    });

    if (this.permissionCache) {
      await this.permissionCache.flush();
    }

    return result;
  }

  /**
   * Lists users for given permission
   * 
   * @param permissions permissions
   * @returns users for given permission
   */
  public async listPermissionsUsers(permissions: PolicyRepresentation[]) {
    const client = await this.getClient();
    
    const policyResolve: PolicyResolveResult = {
      groupPolicyNames: [],
      rolePolicyNames: [],
      userPolicyNames: []
    };

    for (let i = 0; i < permissions.length; i++) {
      const permission = permissions[i];
      const policies = await this.listAuthzPermissionAssociatedPolicies(permission.id!);  
      await this.resolvePolicyTypes(policies, policyResolve);
    }
    
    const roleIds: string[] = _.uniq(_.flatMap(await Promise.all(policyResolve.rolePolicyNames
      .map((name) => {
        return this.findRolePolicyByName(name);
      }))
      .filter((policy) => {
        return !!policy;
      })
      .map((policy) => {
        return policy!.roles || [];
      }))
      .map((role) => {
        return role.id;
      }));
    const roles = await client.roles.find({
      realm: config().keycloak.admin.realm
    } as any);

    const roleMap = _.keyBy(roles, "id");
    const roleNames = (await Promise.all(roleIds
      .map((roleId) => {
        return roleMap[roleId];
      })))
      .map((role) => {
        return role.name!;
      });

    const userGroupIds: string[] = _.uniq(_.flatMap(await Promise.all(policyResolve.groupPolicyNames
      .map((name) => {
        return this.findGroupPolicyByName(name);
      }))
      .filter((policy) => {
        return !!policy;
      })
      .map((policy) => {
        return policy!.groups || [];
      }))
      .map((group) => {
        return group.id!
      }));

    const userGroupUsers = await this.listUserGroupsUsers(userGroupIds);
    const roleUsers = await this.listRolesUsers(roleNames);

    const result = _.uniqBy(userGroupUsers.concat(roleUsers), "id");
    const foundUserIds = result.map((user) => {
      return user.id!;
    });

    const userIds: string[] = _.uniq(_.flatMap(await Promise.all(policyResolve.userPolicyNames
      .map((name) => {
        return this.findUserPolicyByName(name);
      }))
      .filter((policy) => {
        return !!policy;
      })
      .map((policy) => {
        return policy!.users || [];
      })))
      .filter((userId) => {
        return !foundUserIds.includes(userId);
      });

    for (let i = 0; i < userIds.length; i++) {
      const user = await this.findUser(userIds[i]);
      if (user) {
        result.push(user);
      }
    }
    
    return result; 
  }

  public async listAuthzPermissionAssociatedPolicies(permissionId: string): Promise<PolicyRepresentation[]> {
    const client = await this.getClient();
    return client.clients.listAuthzPermissionAssociatedPolicies({
      id: await this.getRestClientInternalId(),
      realm: config().keycloak.admin.realm,
      permissionId: permissionId
    });
  }
  
  /**
   * Checks whether given access token has required scopes
   * 
   * @param resourceName resource name
   * @param scopes scopes
   * @param accessToken access token
   * @returns promise which resolves if access token has given permissions
   */
  public async hasResourcePermission(resourceName: string, scopes: string[], accessToken: string) {
    const userId = this.getAccessTokenUserId(accessToken);
    const cachedPermission = userId ? await this.getCachedPermission(resourceName, scopes, userId) : null;

    if (cachedPermission !== null) {
      return cachedPermission;
    }

    const url = `${config().keycloak.rest["auth-server-url"]}/realms/${config().keycloak.rest.realm}/protocol/openid-connect/token`;
    const headers = {
      Accept: 'application/x-www-form-urlencoded',
      Authorization: `Bearer ${accessToken}`
    };

    const clientId = config().keycloak.rest.resource;
    
    const body: URLSearchParams = new URLSearchParams(); 
    body.append("grant_type", "urn:ietf:params:oauth:grant-type:uma-ticket");
    body.append("client_id", clientId);
    body.append("audience", clientId);

    scopes.forEach((scope) => {
      body.append("permission", `${resourceName}#${scope}`);
    });

    const response = await fetch(url, {
      method: "POST", 
      headers: headers,
      body: body
    });

    const result = response.status === 200;
    
    if (userId) {
      await this.updateCachedPermission(resourceName, scopes, userId, result);
    }

    return result;
  }

  /**
   * Deletes an permission
   * 
   * @param permissionId permission id
   * @return Promise for successful deletion
   */
  public async deletePermission(permissionId: string) {
    const client = await this.getClient();
    return await client.clients.deleteAuthzPermission({
      id: await this.getRestClientInternalId(),
      realm: config().keycloak.admin.realm,
      permissionId: permissionId
    });
  }

  /**
   * Lists user group users
   * 
   * @param userGroupId user group id
   * @return user group users
   */
  public async listUserGroupUsers(userGroupId: string): Promise<UserRepresentation[]> {
    const client = await this.getClient();
    const result = await client.groups.listMembers({
      id: userGroupId,
      realm: config().keycloak.admin.realm
    });

    return result;
  }

  /**
   * Lists user group users
   * 
   * @param userGroupId user group id
   * @return user group users
   */
  public async listUserGroupsUsers(userGroupIds: string[]): Promise<UserRepresentation[]> {
    return _.uniqBy(_.flatMap(await Promise.all(userGroupIds.map((userGroupId) => {
      return this.listUserGroupUsers(userGroupId);
    }))), "id");
  }

  /**
   * Lists users with specified role
   * 
   * @param roleName role name
   * @return users with specified role
   */
  public async listRoleUsers(roleName: string): Promise<UserRepresentation[]> {
    const client = await this.getClient();

    return client.roles.listRoleUsers({
      roleName: roleName,
      realm: config().keycloak.admin.realm
    });
  }


  /**
   * Lists users user roles
   * 
   * @param user user
   * @return user roles
   */
  public async listUserRoles(user: UserRepresentation): Promise<RoleRepresentation[]> {
    if (!user.id) {
      return [];
    }
    
    const client = await this.getClient();
    const userRoleRepresentations = await client.users.listRoleMappings({
      id: user.id,
      realm: config().keycloak.admin.realm
    });  
    return userRoleRepresentations.realmMappings || []
  }  

  /**
   * List's users user groups
   * 
   * @param user user
   * @return user groups
   */
  public async listUserUserGroups(user: UserRepresentation): Promise<GroupRepresentation[]> {
    if (!user.id) {
      return [];
    }
    
    const client = await this.getClient();
    return await client.users.listGroups({ id: user.id, realm: config().keycloak.admin.realm });
  }

  /**
   * Lists users with specified role
   * 
   * @param roleName role name
   * @return users with specified role
   */
  public async listRolesUsers(roleNames: string[]): Promise<UserRepresentation[]> {
    return _.uniqBy(_.flatMap(await Promise.all(roleNames.map((roleName) => {
      return this.listRoleUsers(roleName);
    }))), "id");
  }

  /**
   * Categorizes policy by types for given list of policies
   * 
   * @param policies policies
   * @param result categorized policies
   */
  private async resolvePolicyTypes(policies: PolicyRepresentation[], result: PolicyResolveResult) {
    for (let i = 0; i < policies.length; i++) {
      const policy = policies[i];
      if (!policy.name) {
        continue;
      }

      switch (policy.type) {
        case "group":
          if (!result.groupPolicyNames.includes(policy.name)) {
            result.groupPolicyNames.push(policy.name);
          }
        break;
        case "user":
          if (!result.userPolicyNames.includes(policy.name)) {
            result.userPolicyNames.push(policy.name);
          }
        break;
        case "role":
          if (!result.rolePolicyNames.includes(policy.name)) {
            result.rolePolicyNames.push(policy.name);
          }
        break;
      }
    }
  }

  /**
   * Returns display name for an user
   * 
   * @param user user
   * @returns display name for an user
   */
  public getUserDisplayName(user: UserRepresentation | null): string | null {
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
  
  /**
   * Returns image URL for an user
   * 
   * @param user user
   * @return image URL for an user
   */
  public getUserImage(user: UserRepresentation) {
    const shasum = crypto.createHash("sha1");
    shasum.update((user.email || "").toLowerCase());
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
    let attributes = user.attributes || {};

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
    
    if (value) {
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
    const client = await this.getClient(); 

    return new Promise<any>((resolve, reject) => {
      client.users.findOne({
        realm: config().keycloak.admin.realm,
        id: id
      })
      .then(async (user: any) => {
        resolve(user);
      })
      .catch((err: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(null);
        } 
      });
    });
  }
  
  /**
   * Returns Keycloak admin client
   * 
   * @return Promise for keycloak admin client
   */
  private async getClient(): Promise<KcAdminClient> {
    if (!this.client || this.requireFreshClient) {
      await this.client.auth({
        username: config().keycloak.admin.username,
        password: config().keycloak.admin.password,
        grantType: config().keycloak.admin.grant_type,
        clientId: config().keycloak.admin.client_id,
        clientSecret: config().keycloak.admin.client_secret
      });

      this.requireFreshClient = false;
    }
    
    return this.client;
  }

  /**
   * Returns rest client's internal id
   * 
   * @returns promise for rest client's internal id 
   */
  private async getRestClientInternalId(): Promise<string> {
    if (!this.restClientInternalId) {
      this.restClientInternalId = await this.resolveAuthzClientId();
    }

    return this.restClientInternalId;
  }

  /**
   * Resolves rest client's internal id
   * 
   * @returns promise for rest client's internal id 
   */
  private async resolveAuthzClientId(): Promise<string> {
    const clients = await (await this.getClient()).clients.find({
      clientId: config().keycloak.rest.resource,
      realm: config().keycloak.admin.realm
    });

    if (!clients.length) {
      throw new Error("Failed to resolve REST client's id");
    }

    return clients[0].id!;
  }    
  
  /**
  * Returns an user id from an access token
  * 
  * @param accessToken token
  */
  private getAccessTokenUserId(accessToken: string): string | null {
    const decodedToken: any = jwt_decode(accessToken);
    return decodedToken ? decodedToken.sub || null : null;
  }

  /**
   * Returns permission from cache
   * 
   * @param resourceName resource name
   * @param scopes scopes
   * @param userId user id
   */
  private async getCachedPermission(resourceName: string, scopes: string[], userId: string): Promise<boolean | null> {
    return this.permissionCache ? await this.permissionCache.get(resourceName, scopes, userId) : null;
  }

  /**
   * Updates permission into cache
   * 
   * @param resourceName resource name
   * @param scopes scopes
   * @param userId user id
   * @param permission permission
   */
  public async updateCachedPermission(resourceName: string, scopes: string[], userId: string, permission: boolean): Promise<void> {
    if (this.permissionCache) {
      await this.permissionCache.set(resourceName, scopes, userId, permission);
    }
  }
};
