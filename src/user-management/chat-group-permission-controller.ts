import userManagement from "../user-management";
import ResourceRepresentation from "keycloak-admin/lib/defs/resourceRepresentation";
import GroupPolicyRepresentation from "keycloak-admin/lib/defs/groupPolicyRepresentation";
import GroupRepresentation from "keycloak-admin/lib/defs/groupRepresentation";
import { DecisionStrategy } from "keycloak-admin/lib/defs/policyRepresentation";
import { CHAT_GROUP_MANAGE, CHAT_GROUP_ACCESS, ApplicationScope, CHAT_GROUP_TRAVERSE } from "../rest/application-scopes";
import { ChatGroupModel } from "../models";
import AbstractPermissionController from "./abstract-permission-controller";
import RolePolicyRepresentation from 'keycloak-admin/lib/defs/rolePolicyRepresentation';

export const CHAT_GROUP_SCOPES: ApplicationScope[] = [
  "chat-group:manage",
  "chat-group:access",
  "chat-group:traverse"
];

export default new class ChatGroupPermissionController extends AbstractPermissionController {

  /**
   * Sets a scope for given user group into given chat group
   *
   * @param chatGroup chat group
   * @param userGroup user group
   * @param scope scope. If nulled, all scopes will be removed
   */
  public async setUserGroupChatGroupScope(chatGroup: ChatGroupModel, userGroup: GroupRepresentation, scope: ApplicationScope | null): Promise<null> {
    const groupPolicy = await this.resolveGroupPolicy(userGroup.id!);
    if (!groupPolicy) {
      return null;
    }

    for (let i = 0; i < CHAT_GROUP_SCOPES.length; i++) {
      if (await this.hasChatGroupPermissionPolicy(chatGroup, CHAT_GROUP_SCOPES[i], groupPolicy)) {
        if (!scope || scope !== CHAT_GROUP_SCOPES[i]) {
          await this.removeChatGroupPermissionPolicy(chatGroup, CHAT_GROUP_SCOPES[i], groupPolicy);
        }
      } else {
        if (scope && scope === CHAT_GROUP_SCOPES[i]) {
          await this.addChatGroupPermissionPolicy(chatGroup, CHAT_GROUP_SCOPES[i], groupPolicy);
        }
      }
    }

    return null;
  }

  /**
   * Resolves a scope for given user group in given chat group
   *
   * @param chatGroup chat group
   * @param userGroup user group
   * @returns scope for given user group in given chat group
   */
  public async getUserGroupChatGroupScope(chatGroup: ChatGroupModel, userGroup: GroupRepresentation): Promise<ApplicationScope | null> {
    const groupPolicy = await this.resolveGroupPolicy(userGroup.id!);
    if (!groupPolicy) {
      return null;
    }

    for (let i = 0; i < CHAT_GROUP_SCOPES.length; i++) {
      if (await this.hasChatGroupPermissionPolicy(chatGroup, CHAT_GROUP_SCOPES[i], groupPolicy)) {
        return CHAT_GROUP_SCOPES[i];
      }
    }

    return null;
  }

  /**
   * Resolves scopes for given user group in given chat group
   *
   * @param chatGroup chat group
   * @param userGroup user group
   * @returns list of scopes for given user group in given chat group
   */
  public async getUserGroupChatGroupScopes(chatGroup: ChatGroupModel, userGroup: GroupRepresentation): Promise<string[]> {
    const groupPolicy = await this.resolveGroupPolicy(userGroup.id!);
    if (!groupPolicy) {
      return [];
    }

    const scopes = [];
    for (let i = 0; i < CHAT_GROUP_SCOPES.length; i++) {
      if (await this.hasChatGroupPermissionPolicy(chatGroup, CHAT_GROUP_SCOPES[i], groupPolicy)) {
        scopes.push(CHAT_GROUP_SCOPES[i]);
      }
    }

    return scopes;
  }

  /**
   * Resolves scopes for given role policy list in given chat group
   *
   * @param chatGroup chat group
   * @param allRolePolicies all role policies which permissions should be checked
   * @returns list of scopes for given role policy list
   */
    public async getUserRoleChatGroupScopes(chatGroup: ChatGroupModel, allRolePolicies: RolePolicyRepresentation[]): Promise<string[]> {
      const scopes: string[] = [];

      for (let k = 0; k< allRolePolicies.length; k++) {
        let rolePolicy = allRolePolicies[k]
        for (let i = 0; i < CHAT_GROUP_SCOPES.length; i++) {
          if (await this.hasChatGroupPermissionPolicy(chatGroup, CHAT_GROUP_SCOPES[i], rolePolicy)) {
            scopes.push(CHAT_GROUP_SCOPES[i]);
          }
        }
      }

      return scopes;
    }

  /**
   * Creates resource for a group resource
   *
   * @param chatGroup chat group
   * @return created resource
   */
  public async createChatGroupResource(chatGroup: ChatGroupModel) {
    const resourceName = this.getChatGroupResourceName(chatGroup);
    const resourceUri = this.getChatGroupUri(chatGroup.id);
    return await this.createGroupResource(resourceName, resourceUri, "chat-group", [CHAT_GROUP_TRAVERSE, CHAT_GROUP_ACCESS, CHAT_GROUP_MANAGE]);
  }

  /**
   * Creates chat group permission
   *
   * @param chatGroup chat group
   * @param resource resource
   * @param scope scope
   * @param policyIds policy ids
   */
  public createChatGroupPermission(chatGroup: ChatGroupModel, resource: ResourceRepresentation, scope: ApplicationScope, policyIds: string[]) {
    return userManagement.createScopePermission(this.getPermissionName(chatGroup, scope), [ resource.id || (resource as any)._id ], [ scope ], policyIds, DecisionStrategy.AFFIRMATIVE);
  }

  /**
   * Returns chat group scope permission's name
   *
   * @param chatGroup chat group
   * @param scope scope
   * @return chat group scope permission's name
   */
  public getPermissionName(chatGroup: ChatGroupModel, scope: ApplicationScope) {
    return `${scope}-${chatGroup.id}`;
  }

  /**
   * Returns chat group permission id
   *
   * @param chatGroupId chat group id
   * @param userGroupId user group id
   * @return chat group permission id
   */
  public getChatGroupGroupPermissionId(chatGroupId: number, userGroupId: string) {
    return `chat-group-${chatGroupId}-user-group-${userGroupId}`;
  }

  /**
   * Extracts user group id from group permission id
   *
   * @param groupPermissionId group permission id
   * @return user group id
   */
  public getGroupPermissionIdUserGroupId(groupPermissionId: string): string | null {
    const match = /(chat-group.[0-9]{1,}-user-group-)([a-z0-9-]*)/.exec(groupPermissionId);
    return match ? match[2] || null : null;
  }

  /**
   * Adds a policy to chat group scope permission
   *
   * @param chatGroup chat group
   * @param scope scope
   * @param groupPolicy policy
   */
  private async addChatGroupPermissionPolicy(chatGroup: ChatGroupModel, scope: ApplicationScope, groupPolicy: GroupPolicyRepresentation) {
    const permission = await userManagement.findPermissionByName(this.getPermissionName(chatGroup, scope));
    if (!permission || !permission.id) {
      return;
    }

    const policyIds = await this.getChatGroupPermissionPolicyIds(chatGroup, scope);
    permission.policies = policyIds.concat([groupPolicy.id!]);

    return await userManagement.updateScopePermission(permission.id, permission);
  }

  /**
   * Removes a policy from chat group scope permission
   *
   * @param chatGroup chat group
   * @param scope scope
   * @param groupPolicy policy
   */
  private async removeChatGroupPermissionPolicy(chatGroup: ChatGroupModel, scope: ApplicationScope, groupPolicy: GroupPolicyRepresentation) {
    return this.removePermissionPolicy(this.getPermissionName(chatGroup, scope), groupPolicy);
  }

  /**
   * Returns whether given policy is is associated with chat group permission
   *
   * @param chatGroup chat group
   * @param scope scope
   * @param groupPolicy group policy
   * @returns whether given policy is is associated with chat group permission
   */
  private async hasChatGroupPermissionPolicy(chatGroup: ChatGroupModel, scope: ApplicationScope, groupPolicy: GroupPolicyRepresentation) {
    const policyIds = await this.getChatGroupPermissionPolicyIds(chatGroup, scope);
    return policyIds.includes(groupPolicy.id!);
  }

  /**
   * Returns associated permission policy ids for chat group
   *
   * @param chatGroup chat group
   * @param scope scope
   * @return associated permission policy ids
   */
  private async getChatGroupPermissionPolicyIds(chatGroup: ChatGroupModel, scope: ApplicationScope): Promise<string[]> {
    return this.getPermissionNamePolicyIds(this.getPermissionName(chatGroup, scope));
  }

  /**
   * Returns chat group's URI
   *
   * @param id chat group id
   * @return chat group's URI
   */
  private getChatGroupUri(id: number) {
    return `/rest/v1/chatGroups/${id}`;
  }
}