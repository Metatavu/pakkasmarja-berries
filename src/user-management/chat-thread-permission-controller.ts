import userManagement from "../user-management";
import AbstractPermissionController from "./abstract-permission-controller";
import { ThreadModel } from "../models";
import GroupRepresentation from "keycloak-admin/lib/defs/groupRepresentation";
import { ApplicationScope, CHAT_GROUP_ACCESS, CHAT_GROUP_MANAGE } from "../rest/application-scopes";
import GroupPolicyRepresentation from "keycloak-admin/lib/defs/groupPolicyRepresentation";
import ResourceRepresentation from "keycloak-admin/lib/defs/resourceRepresentation";
import PolicyRepresentation, { DecisionStrategy } from "keycloak-admin/lib/defs/policyRepresentation";
import UserRepresentation from "keycloak-admin/lib/defs/userRepresentation";
import UserPolicyRepresentation from "keycloak-admin/lib/defs/userPolicyRepresentation";

export const CHAT_THREAD_SCOPES: ApplicationScope[] = ["chat-thread:access"];

/**
 * Permission controller for chat threads
 */
export default new class ChatThreadPermissionController extends AbstractPermissionController {

  /**
   * Resolves a scope for given user group in given chat group 
   * 
   * @param chatGroup chat group
   * @param userGroup user group
   * @returns scope for given user group in given chat group
   */
  public async getUserGroupChatThreadScope(chatThread: ThreadModel, userGroup: GroupRepresentation): Promise<ApplicationScope | null> {
    const groupPolicy = await this.resolveGroupPolicy(userGroup.id!);
    if (!groupPolicy) {
      return null;
    }

    for (let i = 0; i < CHAT_THREAD_SCOPES.length; i++) { 
      if (await this.hasChatThreadPermissionPolicy(chatThread, CHAT_THREAD_SCOPES[i], groupPolicy)) {
        return CHAT_THREAD_SCOPES[i];
      }
    }

    return null;
  }

  /**
   * Sets a scope for given user group into given chat thread
   * 
   * @param chatThread chat thread
   * @param userGroup user group
   * @param scope scope
   */
  public async setUserGroupChatThreadScope(chatThread: ThreadModel, userGroup: GroupRepresentation, scope: ApplicationScope): Promise<null> {
    const groupPolicy = await this.resolveGroupPolicy(userGroup.id!);
    if (!groupPolicy) {
      return null;
    }

    for (let i = 0; i < CHAT_THREAD_SCOPES.length; i++) { 
      if (await this.hasChatThreadPermissionPolicy(chatThread, CHAT_THREAD_SCOPES[i], groupPolicy)) {
        if (scope != CHAT_THREAD_SCOPES[i]) {
          await this.removeChatThreadPermissionPolicy(chatThread, CHAT_THREAD_SCOPES[i], groupPolicy);
        }
      } else {
        if (scope == CHAT_THREAD_SCOPES[i]) {
          await this.addChatThreadPermissionPolicy(chatThread, CHAT_THREAD_SCOPES[i], groupPolicy);
        }
      }
    }

    return null;
  }

  /**
   * Returns chat thread scope permission's name
   * 
   * @param chatThread chat thread
   * @param scope scope
   * @return chat thread scope permission's name
   */
  public getPermissionName(chatThread: ThreadModel, scope: ApplicationScope) {
    return `${scope}-${chatThread.id}`;
  }

  /**
   * Returns chat thread permission id
   * 
   * @param chatThreadId chat thread id
   * @param userGroupId user group id
   * @return chat thread permission id
   */
  public getChatThreadGroupPermissionId(chatThread: ThreadModel, userGroupId: string) {
    return `chat-thread-${chatThread.id}-user-group-${userGroupId}`;
  }

  /**
   * Extracts user group id from thread permission id 
   * 
   * @param threadPermissionId thread permission id 
   * @return user group id
   */
  public getThreadPermissionIdUserGroupId(threadPermissionId: string): string | null {
    const match = /(chat-thread.[0-9]{1,}-user-group-)([a-z0-9-]*)/.exec(threadPermissionId);
    return match ? match[2] || null : null;
  }
  
  /**
   * Sets a scope for given user into given chat thread
   * 
   * @param chatThread chat thread
   * @param user user
   * @param scope scope
   */
  public async setUserChatThreadScope(chatThread: ThreadModel, user: UserRepresentation, scope: ApplicationScope | null): Promise<null> {
    const userPolicy = await this.resolveUserPolicy(user.id!);
    if (!userPolicy) {
      return null;
    }

    for (let i = 0; i < CHAT_THREAD_SCOPES.length; i++) { 
      if (await this.hasChatThreadPermissionPolicy(chatThread, CHAT_THREAD_SCOPES[i], userPolicy)) {
        if (scope != CHAT_THREAD_SCOPES[i]) {
          await this.removeChatThreadPermissionPolicy(chatThread, CHAT_THREAD_SCOPES[i], userPolicy);
        }
      } else {
        if (scope == CHAT_THREAD_SCOPES[i]) {
          await this.addChatThreadPermissionPolicy(chatThread, CHAT_THREAD_SCOPES[i], userPolicy);
        }
      }
    }

    return null;
  }

  /**
   * Returns chat thread permission id
   * 
   * @param chatThreadId chat thread id
   * @param userId user id
   * @return chat thread permission id
   */
  public getChatThreadUserPermissionId(chatThread: ThreadModel, userId: string) {
    return `chat-thread-${chatThread.id}-user-${userId}`;
  }

  /**
   * Extracts user id from thread permission id 
   * 
   * @param threadPermissionId thread permission id 
   * @return user id
   */
  public getThreadPermissionIdUserId(threadPermissionId: string): string | null {
    const match = /(chat-thread.[0-9]{1,}-user-)([a-z0-9-]*)/.exec(threadPermissionId);
    return match ? match[2] || null : null;
  }

  /**
   * Resolves a scope for given user in given chat thread 
   * 
   * @param chatGroup chat group
   * @param user user
   * @returns scope for given user in given chat thread
   */
  public async getUserChatThreadScope(chatThread: ThreadModel, user: UserRepresentation): Promise<ApplicationScope | null> {
    const userPolicy = await this.resolveUserPolicy(user.id!);
    if (!userPolicy) {
      return null;
    }

    for (let i = 0; i < CHAT_THREAD_SCOPES.length; i++) { 
      if (await this.hasChatThreadPermissionPolicy(chatThread, CHAT_THREAD_SCOPES[i], userPolicy)) {
        return CHAT_THREAD_SCOPES[i];
      }
    }

    return null;
  }

  /**
   * Resolves scopes for given user in given chat thread 
   * 
   * @param chatGroup chat group
   * @param user user
   * @returns list of scopes for given user in given chat thread
   */
  public async getUserChatThreadScopes(chatThread: ThreadModel, user: UserRepresentation): Promise<string[]> {
    const userPolicy = await this.resolveUserPolicy(user.id!);
    if (!userPolicy) {
      return [];
    }

    const scopes = [];
    for (let i = 0; i < CHAT_THREAD_SCOPES.length; i++) { 
      if (await this.hasChatThreadPermissionPolicy(chatThread, CHAT_THREAD_SCOPES[i], userPolicy)) {
        scopes.push(CHAT_THREAD_SCOPES[i]);
      }
    }

    return scopes;
  }

  /**
   * Finds resource for a chat thread
   * 
   * @param chatThread chat thread
   * @return resource or null if not found
   */
  public async findChatThreadResource(chatThread: ThreadModel): Promise<ResourceRepresentation | null> {
    const resourceUri = this.getChatThreadUri(chatThread.id);
    return await userManagement.findResourceByUri(resourceUri);
  }

  /**
   * Creates resource for a thread resource
   * 
   * @param chatGroup chat thread
   * @return created resource
   */
  public async createChatThreadResource(chatThread: ThreadModel) {
    const resourceName = this.getChatThreadResourceName(chatThread);
    const resourceUri = this.getChatThreadUri(chatThread.id);
    return await this.createGroupResource(resourceName, resourceUri, "chat-thread", CHAT_THREAD_SCOPES);
  }

  /**
   * Finds chat thread permission
   *  
   * @param chatThread chat thread
   * @param scope scope
   * @reutrns found permission or null if not found
   */
  public findChatThreadPermission(chatThread: ThreadModel, scope: ApplicationScope): Promise<PolicyRepresentation | null> {
    return userManagement.findPermissionByName(this.getPermissionName(chatThread, scope));
  }

  /**
   * Creates chat thread permission
   * 
   * @param chatThread chat thread
   * @param resource resource
   * @param scope scope
   * @param policyIds policy ids
   */
  public createChatThreadPermission(chatThread: ThreadModel, resource: ResourceRepresentation, scope: ApplicationScope, policyIds: string[]) {
    return userManagement.createScopePermission(this.getPermissionName(chatThread, scope), [ resource.id || (resource as any)._id ], [ scope ], policyIds, DecisionStrategy.AFFIRMATIVE);
  }

  /**
   * Adds a policy to chat thread scope permission
   * 
   * @param chatThread chat thread
   * @param scope scope
   * @param groupPolicy policy
   */
  private async addChatThreadPermissionPolicy(chatThread: ThreadModel, scope: ApplicationScope, policy: UserPolicyRepresentation | GroupPolicyRepresentation) {
    const permission = await userManagement.findPermissionByName(this.getPermissionName(chatThread, scope));
    if (!permission || !permission.id) {
      throw new Error(`Failed to find permission ${this.getPermissionName(chatThread, scope)}`);
    }

    const policyIds = await this.getChatThreadPermissionPolicyIds(chatThread, scope);
    permission.policies = policyIds.concat([policy.id!]);
    
    return await userManagement.updateScopePermission(permission.id, permission);
  }

  /**
   * Removes a policy from chat thread scope permission
   * 
   * @param chatThread chat thread
   * @param scope scope
   * @param groupPolicy policy
   */
  private async removeChatThreadPermissionPolicy(chatThread: ThreadModel, scope: ApplicationScope, policy: UserPolicyRepresentation | GroupPolicyRepresentation) {
    return this.removePermissionPolicy(this.getPermissionName(chatThread, scope), policy);
  }

  /**
   * Returns whether given policy is is associated with chat thread permission  
   * 
   * @param chatThread chat thread
   * @param scope scope
   * @param groupPolicy group policy
   * @returns whether given policy is is associated with chat thread permission
   */
  private async hasChatThreadPermissionPolicy(chatThread: ThreadModel, scope: ApplicationScope, policy: UserPolicyRepresentation | GroupPolicyRepresentation) {
    const policyIds = await this.getChatThreadPermissionPolicyIds(chatThread, scope);
    return policyIds.includes(policy.id!);
  }

  /**
   * Returns associated permission policy ids for chat thread 
   * 
   * @param chatThread chat thread
   * @param scope scope
   * @return associated permission policy ids
   */
  private async getChatThreadPermissionPolicyIds(chatThread: ThreadModel, scope: ApplicationScope): Promise<string[]> {
    return this.getPermissionNamePolicyIds(this.getPermissionName(chatThread, scope));
  }

  /**
   * Returns chat thread's URI
   * 
   * @param id chat thread id
   * @return chat thread's URI
   */
  private getChatThreadUri(id: number) {
    return `/rest/v1/chatThreads/${id}`;
  }

}