import * as _ from "lodash";
import userManagement from ".";
import { ApplicationScope } from "../rest/application-scopes";
import ResourceRepresentation from "keycloak-admin/lib/defs/resourceRepresentation";
import PolicyRepresentation, { DecisionStrategy } from "keycloak-admin/lib/defs/policyRepresentation";
import { ChatGroupModel, ThreadModel } from "../models";
import GroupPolicyRepresentation from "keycloak-admin/lib/defs/groupPolicyRepresentation";
import UserPolicyRepresentation from "keycloak-admin/lib/defs/userPolicyRepresentation";

/**
 * Abstract base class for permission controllers
 */
export default class AbstractPermissionController {

  /**
   * Returns resource name for a group
   *
   * @param chatGroup chat group
   * @return resource name for a group
   */
  public getChatGroupResourceName(chatGroup: ChatGroupModel) {
    return `chat-group-${chatGroup.id}`;
  }

  /**
   * Deletes a permission
   *
   * @param name permission name
   * @return promise for deletion
   */
  public async deletePermission(name: string) {
    const permission = await userManagement.findPermissionByName(name);
    if (permission && permission.id) {
      this.deletePermissionById(permission.id);
    }
  }

  /**
   * Returns resource name for a thread
   *
   * @param chatThread chat thread
   * @return resource name for a thread
   */
  public getChatThreadResourceName(chatThread: ThreadModel) {
    return `chat-thread-${chatThread.id}`;
  }

  /**
   * Grants user an owner permission to given resource
   *
   * @param userId user id
   * @param resourceType resource type
   * @param resourceName resource name
   * @param resourceUri resource URI
   * @param permissionName permission's name
   */
  protected async addOwnerPermission(userId: string, resourceType: string, resourceName: string, resourceUri: string, permissionName: string, scopes: ApplicationScope[]) {
    const resource = await this.createGroupResource(resourceName, resourceUri, resourceType, scopes);
    const policy = await this.createUserPolicy(userId);
    const permission = await userManagement.findPermissionByName(permissionName);
    if (permission) {
      await userManagement.deletePermission(permission.id!);
    }

    return await this.createScopePermission(permissionName, resource, scopes, policy);
  }

  /**
   * Finds or creates group policies for given group id
   *
   * @param userGroupId user group id
   * @returns promise for group policy
   */
  protected async resolveGroupPolicy(userGroupId: string): Promise<GroupPolicyRepresentation> {
    const policyName = `user-group-${userGroupId}`;
    const policy = await userManagement.findGroupPolicyByName(policyName);
    if (policy) {
      return policy;
    }

    return userManagement.createGroupPolicy(policyName, [ userGroupId ]);
  }

  /**
   * Finds or creates user policies for given user id
   *
   * @param user user id
   * @returns promise for user policy
   */
  protected async resolveUserPolicy(userId: string): Promise<UserPolicyRepresentation> {
    const policyName = `user-${userId}`;
    const policy = await userManagement.findUserPolicyByName(policyName);
    if (policy) {
      return policy;
    }

    return userManagement.createUserPolicy(policyName, [ userId ]);
  }

  /**
   * Deletes a permission
   *
   * @param permissionId permission id
   * @return promise for deletion
   */
  protected deletePermissionById(permissionId: string) {
    return userManagement.deletePermission(permissionId);
  }

  /**
   * Creates scope permission
   *
   * @param name name
   * @param resource resource
   * @param scopes scopes
   * @param policy policy
   * @return created permission
   */
  protected async createScopePermission(name: string, resource: ResourceRepresentation, scopes: ApplicationScope[], policy: PolicyRepresentation) {
    return userManagement.createScopePermission(name, [ resource.id || (resource as any)._id ], scopes, [ policy.id! ], DecisionStrategy.AFFIRMATIVE);
  }

  /**
   * Finds or creates an user policy
   *
   * @param userId user id
   * @returns promise for user policy
   */
  protected async createUserPolicy(userId: string) {
    const name = `user-${userId}`;

    let result = await userManagement.findUserPolicyByName(name);
    if (!result) {
      result = await userManagement.createUserPolicy(name, [ userId ]);
    }

    return result;
  }

  /**
   * Finds or creates new group resource into the Keycloak
   *
   * @param id group id
   * @returns promise for group resource
   */
  protected async createGroupResource (name: string, uri: string, type: string, scopes: ApplicationScope[]): Promise<ResourceRepresentation> {
    let resource = await userManagement.findResourceByUri(uri);
    if (!resource) {
      resource = await userManagement.createResource(name, name, uri, type, scopes);
    }

    return resource!;
  }

  /**
   * Returns associated permission policy ids for given permission
   *
   * @param permissionName name of permission
   * @return associated permission policy ids
   */
  protected async getPermissionNamePolicyIds(permissionName: string): Promise<string[]> {
    return this.getPermissionPolicyIds(await userManagement.findPermissionByName(permissionName));
  }

  /**
   * Returns whether group policy is associated with given permission
   *
   * @param permission permission
   * @param groupPolicy group policy
   * @return whether group policy is associated with given permission
   */
  protected async hasPermissionPolicy(permission: PolicyRepresentation, groupPolicy: GroupPolicyRepresentation): Promise<boolean> {
    const policyIds = await this.getPermissionPolicyIds(permission);
    return policyIds.includes(groupPolicy.id!);
  }

  /**
   * Returns associated permission policy ids for given permission
   *
   * @param permissionName name of permission
   * @return associated permission policy ids
   */
  protected async getPermissionPolicyIds(permission: PolicyRepresentation | null): Promise<string[]> {
    if (!permission) {
      return [];
    }

    const policies = await userManagement.listAuthzPermissionAssociatedPolicies(permission.id!);

    return policies.map((policy) => {
      return policy.id!;
    });
  }

  /**
   * Adds a policy to scope permission
   *
   * @param permissionName name of permission
   * @param groupPolicy policy
   */
  protected async addPermissionPolicy(permissionName: string, groupPolicy: GroupPolicyRepresentation) {
    const permission = await userManagement.findPermissionByName(permissionName);
    if (!permission || !permission.id) {
      return;
    }

    const policyIds = await this.getPermissionPolicyIds(permission);
    permission.policies = policyIds.concat([groupPolicy.id!]);

    return await userManagement.updateScopePermission(permission.id, permission);
  }

  /**
   * Removes a policy from chat group scope permission
   *
   * @param permissionName name of permission
   * @param groupPolicy policy
   */
  protected async removePermissionPolicy(permissionName: string, groupPolicy: GroupPolicyRepresentation) {
    const permission = await userManagement.findPermissionByName(permissionName);
    if (!permission || !permission.id) {
      return;
    }

    const policyIds = await this.getPermissionPolicyIds(permission);
    permission.policies = _.without(policyIds, groupPolicy.id! );

    return await userManagement.updateScopePermission(permission.id, permission);
  }

}