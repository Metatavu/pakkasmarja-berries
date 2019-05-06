import * as _ from "lodash";
import slugify from "slugify";
import ChatThreadsService from "../api/chatThreads.service";
import { Request, Response } from "express";
import ApplicationRoles from "../application-roles";
import models, { ThreadModel, ThreadPredefinedTextModel, ChatGroupModel } from "../../models";
import excel from "../../excel";
import { ChatThread, ChatGroupType, ChatThreadGroupPermission, ChatThreadPermissionScope, ChatThreadUserPermission } from "../model/models";
import { CHAT_GROUP_ACCESS, CHAT_GROUP_MANAGE, ApplicationScope, CHAT_GROUP_TRAVERSE } from "../application-scopes";
import { Promise } from "bluebird";
import mqtt from "../../mqtt";
import userManagement from "../../user-management";
import GroupPolicyRepresentation from "keycloak-admin/lib/defs/groupPolicyRepresentation";
import GroupRepresentation from "keycloak-admin/lib/defs/groupRepresentation";
import ResourceRepresentation from "keycloak-admin/lib/defs/resourceRepresentation";
import { DecisionStrategy } from "keycloak-admin/lib/defs/policyRepresentation";
import UserRepresentation from "keycloak-admin/lib/defs/userRepresentation";
import UserPolicyRepresentation from "keycloak-admin/lib/defs/userPolicyRepresentation";

const CHAT_THREAD_SCOPES: ApplicationScope[] = ["chat-thread:access"];

/**
 * Threads REST service
 */
export default class ChatThreadsServiceImpl extends ChatThreadsService {

  /**
   * @inheritdoc
   */
  public async createChatThreadGroupPermissions(req: Request, res: Response): Promise<void> {
    const chatThreadId = parseInt(req.params.chatThreadId);

    const chatThread = await models.findThread(chatThreadId);
    if (!chatThread) {
      this.sendNotFound(res);
      return;
    }

    const chatGroup = await models.findChatGroup(chatThread.groupId);
    if (!chatGroup) {
      this.sendBadRequest(res, "Invalid chat group id");
      return;
    }

    if (!(await this.isThreadManagePermission(req, chatThread, chatGroup))) {
      this.sendForbidden(res);
      return;
    }

    const body: ChatThreadGroupPermission = req.body;

    const userGroupId = body.userGroupId;
    if (!userGroupId) {
      this.sendInternalServerError(res, "Missing userGroupId");
      return;
    }

    const userGroup = await userManagement.findGroup(userGroupId);
    if (!userGroup || !userGroup.id) {
      this.sendInternalServerError(res, "Could not find user group");
      return;
    }

    const scope = this.translatePermissionScope(body.scope);
    if (!scope) {
      this.sendBadRequest(res, `Invalid scope ${body.scope}`);
      return;
    }

    await this.setUserGroupChatThreadScope(chatThread, userGroup, scope);

    const result: ChatThreadGroupPermission = {
      chatThreadId: chatThread.id,
      userGroupId: userGroup.id,
      id: this.getChatThreadGroupPermissionId(chatThread, userGroup.id),
      scope: body.scope
    };

    res.status(200).send(result);
  }

  /**
   * @inheritdoc
   */
  public async findChatThreadGroupPermission(req: Request, res: Response): Promise<void> {
    const chatThreadId = parseInt(req.params.chatThreadId);

    const chatThread = await models.findThread(chatThreadId);
    if (!chatThread) {
      this.sendNotFound(res);
      return;
    }

    const chatGroup = await models.findChatGroup(chatThread.groupId);
    if (!chatGroup) {
      this.sendBadRequest(res, "Invalid chat group id");
      return;
    }

    if (!(await this.isThreadManagePermission(req, chatThread, chatGroup))) {
      this.sendForbidden(res);
      return;
    }
    
    const chatThreadPermissionId = req.params.permissionId;
    const userGroupId = this.getThreadPermissionIdUserGroupId(chatThreadPermissionId);
    if (!userGroupId) {
      this.sendInternalServerError(res, "Failed to extract userGroupId");
      return;
    }

    const userGroup = await userManagement.findGroup(userGroupId);
    if (!userGroup || !userGroup.id) {
      this.sendInternalServerError(res, "Could not find user group");
      return;
    }

    const scope = this.translateApplicationScope(await this.getUserGroupChatThreadScope(chatThread, userGroup));
    if (!scope) {
      this.sendNotFound(res);
      return;      
    }

    const result: ChatThreadGroupPermission = {
      chatThreadId: chatThread.id,
      userGroupId: userGroup.id,
      id: this.getChatThreadGroupPermissionId(chatThread, userGroup.id),
      scope: scope
    };

    res.status(200).send(result);
  }

  /**
   * @inheritdoc
   */
  public async listChatThreadGroupPermissions(req: Request, res: Response): Promise<void> {
    const chatThreadId = parseInt(req.params.chatThreadId);

    const chatThread = await models.findThread(chatThreadId);
    if (!chatThread) {
      this.sendNotFound(res);
      return;
    }

    const chatGroup = await models.findChatGroup(chatThread.groupId);
    if (!chatGroup) {
      this.sendBadRequest(res, "Invalid chat group id");
      return;
    }

    if (!(await this.isThreadManagePermission(req, chatThread, chatGroup))) {
      this.sendForbidden(res);
      return;
    }

    const userGroups = await userManagement.listGroups(0, 999);
    
    const result = (await Promise.all(userGroups.map(async (userGroup) => {      
      const scope = this.translateApplicationScope(await this.getUserGroupChatThreadScope(chatThread, userGroup));
      if (!scope) {
        return null;
      }

      const result: ChatThreadGroupPermission = {
        chatThreadId: chatThread.id,
        userGroupId: userGroup.id!,
        id: this.getChatThreadGroupPermissionId(chatThread, userGroup.id!),
        scope: scope
      };
  
      return result;
    })))
    .filter((permission) => {
      return permission;
    });
    
    res.status(200).send(result);
  }

  /**
   * @inheritdoc
   */
  public async updateChatThreadGroupPermission(req: Request, res: Response): Promise<void> {
    const chatThreadId = parseInt(req.params.chatThreadId);

    const chatThread = await models.findThread(chatThreadId);
    if (!chatThread) {
      this.sendNotFound(res);
      return;
    }

    const chatGroup = await models.findChatGroup(chatThread.groupId);
    if (!chatGroup) {
      this.sendBadRequest(res, "Invalid chat group id");
      return;
    }

    if (!(await this.isThreadManagePermission(req, chatThread, chatGroup))) {
      this.sendForbidden(res);
      return;
    }

    const body: ChatThreadGroupPermission = req.body;
    const chatThreadPermissionId = req.params.permissionId;

    const userGroupId = this.getThreadPermissionIdUserGroupId(chatThreadPermissionId);
    if (!userGroupId) {
      this.sendInternalServerError(res, "Failed to extract userGroupId");
      return;
    }

    const userGroup = await userManagement.findGroup(userGroupId);
    if (!userGroup || !userGroup.id) {
      this.sendInternalServerError(res, "Could not find user group");
      return;
    }
    
    const scope = this.translatePermissionScope(body.scope);
    if (!scope) {
      this.sendBadRequest(res, `Invalid scope ${body.scope}`);
      return;
    }

    await this.setUserGroupChatThreadScope(chatThread, userGroup, scope);

    const result: ChatThreadGroupPermission = {
      chatThreadId: chatThread.id,
      userGroupId: userGroup.id,
      id: this.getChatThreadGroupPermissionId(chatThread, userGroup.id),
      scope: body.scope
    };

    res.status(200).send(result);
  }

  /**
   * @inheritdoc
   */
  public async createChatThreadUserPermission(req: Request, res: Response): Promise<void> {
    const chatThreadId = parseInt(req.params.chatThreadId);

    const chatThread = await models.findThread(chatThreadId);
    if (!chatThread) {
      this.sendNotFound(res);
      return;
    }

    const chatGroup = await models.findChatGroup(chatThread.groupId);
    if (!chatGroup) {
      this.sendBadRequest(res, "Invalid chat group id");
      return;
    }

    if (!(await this.isThreadManagePermission(req, chatThread, chatGroup))) {
      this.sendForbidden(res);
      return;
    }

    const body: ChatThreadUserPermission = req.body;
    const userId = body.userId;
    if (!userId) {
      this.sendInternalServerError(res, "Missing userId");
      return;
    }

    const user = await userManagement.findUser(userId);
    if (!user || !user.id) {
      this.sendInternalServerError(res, "Could not find user");
      return;
    }

    const scope = this.translatePermissionScope(body.scope);
    if (!scope) {
      this.sendBadRequest(res, `Invalid scope ${body.scope}`);
      return;
    }

    const resource = await this.createChatThreadResource(chatThread);
    await this.createChatThreadPermission(chatThread, resource, "chat-thread:access", []);
    await this.setUserChatThreadScope(chatThread, user, scope);

    const result: ChatThreadUserPermission = {
      chatThreadId: chatThread.id,
      userId: user.id,
      id: this.getChatThreadUserPermissionId(chatThread, user.id),
      scope: body.scope
    };

    res.status(200).send(result);
  }

  /**
   * @inheritdoc
   */
  public async findChatThreadUserPermission(req: Request, res: Response): Promise<void> {
    const chatThreadId = parseInt(req.params.chatThreadId);

    const chatThread = await models.findThread(chatThreadId);
    if (!chatThread) {
      this.sendNotFound(res);
      return;
    }

    const chatGroup = await models.findChatGroup(chatThread.groupId);
    if (!chatGroup) {
      this.sendBadRequest(res, "Invalid chat group id");
      return;
    }

    if (!(await this.isThreadManagePermission(req, chatThread, chatGroup))) {
      this.sendForbidden(res);
      return;
    }
    
    const chatThreadPermissionId = req.params.permissionId;
    const userId = this.getThreadPermissionIdUserId(chatThreadPermissionId);
    if (!userId) {
      this.sendInternalServerError(res, "Failed to extract userId");
      return;
    }

    const user = await userManagement.findUser(userId);
    if (!user || !user.id) {
      this.sendInternalServerError(res, "Could not find user");
      return;
    }

    const scope = this.translateApplicationScope(await this.getUserChatThreadScope(chatThread, user));
    if (!scope) {
      this.sendNotFound(res);
      return;      
    }

    const result: ChatThreadUserPermission = {
      chatThreadId: chatThread.id,
      userId: user.id,
      id: this.getChatThreadUserPermissionId(chatThread, user.id),
      scope: scope
    };

    res.status(200).send(result);
  }

  /**
   * @inheritdoc
   */
  public async listChatThreadUserPermissions(req: Request, res: Response): Promise<void> {
    const chatThreadId = parseInt(req.params.chatThreadId);

    const chatThread = await models.findThread(chatThreadId);
    if (!chatThread) {
      this.sendNotFound(res);
      return;
    }

    const chatGroup = await models.findChatGroup(chatThread.groupId);
    if (!chatGroup) {
      this.sendBadRequest(res, "Invalid chat group id");
      return;
    }

    if (!(await this.isThreadManagePermission(req, chatThread, chatGroup))) {
      this.sendForbidden(res);
      return;
    }

    // TODO: Max 999?
    const users = await userManagement.listUsers({
      max: 999
    });
    
    const result = (await Promise.all(users.map(async (user) => {      
      const scope = this.translateApplicationScope(await this.getUserChatThreadScope(chatThread, user));
      if (!scope) {
        return null;
      }

      const result: ChatThreadUserPermission = {
        chatThreadId: chatThread.id,
        userId: user.id!,
        id: this.getChatThreadUserPermissionId(chatThread, user.id!),
        scope: scope
      };
  
      return result;
    })))
    .filter((permission) => {
      return permission;
    });
    
    res.status(200).send(result);
  }

  /**
   * @inheritdoc
   */
  public async updateChatThreadUserPermission(req: Request, res: Response): Promise<void> {
    const chatThreadId = parseInt(req.params.chatThreadId);

    const chatThread = await models.findThread(chatThreadId);
    if (!chatThread) {
      this.sendNotFound(res);
      return;
    }

    const chatGroup = await models.findChatGroup(chatThread.groupId);
    if (!chatGroup) {
      this.sendBadRequest(res, "Invalid chat group id");
      return;
    }

    if (!(await this.isThreadManagePermission(req, chatThread, chatGroup))) {
      this.sendForbidden(res);
      return;
    }

    const body: ChatThreadUserPermission = req.body;
    const chatThreadPermissionId = req.params.permissionId;

    const userId = this.getThreadPermissionIdUserId(chatThreadPermissionId);
    if (!userId) {
      this.sendInternalServerError(res, "Failed to extract userId");
      return;
    }

    const user = await userManagement.findUser(userId);
    if (!user || !user.id) {
      this.sendInternalServerError(res, "Could not find user");
      return;
    }
    
    const scope = this.translatePermissionScope(body.scope);
    if (!scope) {
      this.sendBadRequest(res, `Invalid scope ${body.scope}`);
      return;
    }

    await this.setUserChatThreadScope(chatThread, user, scope);

    const result: ChatThreadUserPermission = {
      chatThreadId: chatThread.id,
      userId: user.id,
      id: this.getChatThreadUserPermissionId(chatThread, user.id),
      scope: body.scope
    };

    res.status(200).send(result);
  }

  /**
   * @inheritdoc
   */
  public async createChatThread(req: Request, res: Response): Promise<void> {
    const payload: ChatThread = req.body;
    const chatGroupId = payload.groupId;
    const chatGroup = await models.findChatGroup(chatGroupId);
    if (!chatGroup) {
      this.sendBadRequest(res, `Invalid chat group id ${chatGroupId} specified when creating new thread`);
      return;
    }

    if (!(await this.hasResourcePermission(req, this.getChatGroupResourceName(chatGroup), [CHAT_GROUP_MANAGE]))) {
      this.sendForbidden(res);
      return;
    }

    const ownerId = this.getLoggedUserId(req);
    const thread = await models.createThread(chatGroup.id, ownerId, payload.title, payload.description, chatGroup.type, payload.imageUrl, payload.answerType, payload.pollAllowOther || true, payload.expiresAt);
    const resource = await this.createChatThreadResource(thread);    
    await this.createChatThreadPermission(thread, resource, "chat-thread:access", []);

    res.status(200).send(await this.translateChatThread(thread, chatGroup));

    mqtt.publish("chatthreads", {
      "operation": "CREATED",
      "id": thread.id
    });
  }

  /**
   * @inheritdoc
   */
  public async deleteChatThread(req: Request, res: Response): Promise<void> {
    const chatThreadId = parseInt(req.params.chatThreadId);
    const thread = await models.findThread(chatThreadId);
    if (!thread) {
      this.sendNotFound(res);
      return;
    }

    const chatGroup = await models.findChatGroup(thread.groupId);
    if (!chatGroup) {
      this.sendInternalServerError(res);
      return;
    }

    if (!(await this.hasResourcePermission(req, this.getChatGroupResourceName(chatGroup), [CHAT_GROUP_MANAGE]))) {
      this.sendForbidden(res);
      return;
    }

    models.deleteThread(thread.id);
    await this.deletePermission(this.getPermissionName(thread, "chat-thread:access"));

    res.status(204).send();

    mqtt.publish("chatthreads", {
      "operation": "DELETED",
      "id": chatThreadId
    });
  }

  /**
   * @inheritdoc
   */
  public async findChatThread(req: Request, res: Response): Promise<void> {
    const chatThreadId = req.params.chatThreadId;
    const thread = await models.findThread(chatThreadId);
    if (!thread) {
      this.sendNotFound(res);
      return;
    }

    const chatGroup = await models.findChatGroup(thread.groupId);
    if (!chatGroup) {
      this.sendInternalServerError(res);
      return;
    }

    if (!(await this.isThreadAccessPermission(req, thread, chatGroup))) {
      this.sendForbidden(res);
      return;
    }

    res.status(200).send(await this.translateChatThread(thread, chatGroup));
  }

  /**
   * @inheritdoc
   */
  public async listChatThreads(req: Request, res: Response): Promise<void> {
    const groupId = req.query.groupId;
    const groupType: ChatGroupType = req.query.groupType;
    const allChatGroups = groupId ? [ models.findChatGroup(groupId) ] : models.listChatGroups(groupType);
    const chatGroups = await Promise.all(Promise.filter(allChatGroups, (chatGroup) => {
      if (!chatGroup) {
        return false;
      }

      if (this.hasResourcePermission(req, this.getChatGroupResourceName(chatGroup), [CHAT_GROUP_TRAVERSE])) {
        return true;
      }

      return this.hasResourcePermission(req, this.getChatGroupResourceName(chatGroup), [CHAT_GROUP_ACCESS]);
    }));

    const chatGroupMap = _.keyBy(chatGroups, "id");
    const chatGroupIds = _.map(chatGroups, "id");

    const threads = await Promise.all(Promise.filter(await models.listThreads(chatGroupIds), async (thread) => {
      return this.isThreadAccessPermission(req, thread, chatGroupMap[thread.groupId]);
    }));

    res.status(200).send(await Promise.all(threads.map((thread) => {
      return this.translateChatThread(thread, chatGroupMap[thread.groupId]);
    })));
  }

  /**
   * @inheritdoc
   */
  public async updateChatThread(req: Request, res: Response): Promise<void> {
    const payload: ChatThread = req.body;

    const chatThreadId = req.params.chatThreadId;
    const thread = await models.findThread(chatThreadId);
    if (!thread) {
      this.sendNotFound(res);
      return;
    }

    const chatGroup = await models.findChatGroup(thread.groupId);
    if (!chatGroup) {
      this.sendInternalServerError(res);
      return;
    }

    if (!(await this.isThreadManagePermission(req, thread, chatGroup))) {
      this.sendForbidden(res);
      return;
    }

    await models.updateThread(thread.id, thread.ownerId || null, payload.title, payload.description, payload.imageUrl, true, payload.answerType, payload.pollAllowOther || true, payload.expiresAt);

    res.status(200).send(await this.translateChatThread(await models.findThread(chatThreadId), chatGroup));

    mqtt.publish("chatthreads", {
      "operation": "UPDATED",
      "id": thread.id
    });
  }

  /**
   * @inheritdoc
   */
  public async getChatThreadReport(req: Request, res: Response) {
    if (!this.hasRealmRole(req, ApplicationRoles.MANAGE_THREADS)) {
      this.sendForbidden(res, "You have no permission to manage threads");
      return;
    }

    const threadId = req.params.threadId;
    const type = req.params.type;
    const thread = await models.findThread(threadId);
    if (!thread) {
      return this.sendNotFound(res, "Not found");
    }

    if (!type) {
      return this.sendBadRequest(res, "Type is required");
    }
    
    const expectedTypes = ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
    const accept = this.getBareContentType(req.header("accept")) || expectedTypes[0];

    if (expectedTypes.indexOf(accept) === -1) {
      this.sendBadRequest(res, `Unsupported accept ${accept}, should be one of ${expectedTypes.join(",")}`);
      return;
    }

    res.setHeader("Content-type", accept);

    switch (type) {
      case "summaryReport":
        return await this.sendChatThreadSummaryReportXLSX(req, res, thread);
      default:
        return this.sendBadRequest(res, `Invalid type ${type}`);
    }
  }

  /**
   * Resolves a scope for given user group in given chat group 
   * 
   * @param chatGroup chat group
   * @param userGroup user group
   * @returns scope for given user group in given chat group
   */
  private async getUserGroupChatThreadScope(chatThread: ThreadModel, userGroup: GroupRepresentation): Promise<ApplicationScope | null> {
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
  private async setUserGroupChatThreadScope(chatThread: ThreadModel, userGroup: GroupRepresentation, scope: ApplicationScope): Promise<null> {
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
   * Extracts user group id from thread permission id 
   * 
   * @param threadPermissionId thread permission id 
   * @return user group id
   */
  private getThreadPermissionIdUserGroupId(threadPermissionId: string): string | null {
    const match = /(chat-thread.[0-9]{1,}-user-group-)([a-z0-9-]*)/.exec(threadPermissionId);
    return match ? match[2] || null : null;
  }


  /**
   * Resolves a scope for given user in given chat thread 
   * 
   * @param chatGroup chat group
   * @param user user
   * @returns scope for given user in given chat thread
   */
  private async getUserChatThreadScope(chatThread: ThreadModel, user: UserRepresentation): Promise<ApplicationScope | null> {
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
   * Sets a scope for given user into given chat thread
   * 
   * @param chatThread chat thread
   * @param user user
   * @param scope scope
   */
  private async setUserChatThreadScope(chatThread: ThreadModel, user: UserRepresentation, scope: ApplicationScope): Promise<null> {
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
   * Extracts user id from thread permission id 
   * 
   * @param threadPermissionId thread permission id 
   * @return user id
   */
  private getThreadPermissionIdUserId(threadPermissionId: string): string | null {
    const match = /(chat-thread.[0-9]{1,}-user-)([a-z0-9-]*)/.exec(threadPermissionId);
    return match ? match[2] || null : null;
  }

  /**
   * Creates resource for a thread resource
   * 
   * @param chatGroup chat thread
   * @return created resource
   */
  private async createChatThreadResource(chatThread: ThreadModel) {
    const resourceName = this.getChatThreadResourceName(chatThread);
    const resourceUri = this.getChatThreadUri(chatThread.id);
    return await this.createGroupResource(resourceName, resourceUri, "chat-group", [CHAT_GROUP_ACCESS, CHAT_GROUP_MANAGE]);
  }

  /**
   * Creates chat thread permission
   * 
   * @param chatThread chat thread
   * @param resource resource
   * @param scope scope
   * @param policyIds policy ids
   */
  private createChatThreadPermission(chatThread: ThreadModel, resource: ResourceRepresentation, scope: ApplicationScope, policyIds: string[]) {
    return userManagement.createScopePermission(this.getPermissionName(chatThread, scope), [ resource.id || (resource as any)._id ], [ scope ], policyIds, DecisionStrategy.AFFIRMATIVE);
  }

  /**
   * Returns chat thread permission id
   * 
   * @param chatThreadId chat thread id
   * @param userGroupId user group id
   * @return chat thread permission id
   */
  private getChatThreadGroupPermissionId(chatThread: ThreadModel, userGroupId: string) {
    return `chat-thread-${chatThread.id}-user-group-${userGroupId}`;
  }

  /**
   * Returns chat thread permission id
   * 
   * @param chatThreadId chat thread id
   * @param userId user id
   * @return chat thread permission id
   */
  private getChatThreadUserPermissionId(chatThread: ThreadModel, userId: string) {
    return `chat-thread-${chatThread.id}-user-${userId}`;
  }

  /**
   * Returns chat thread scope permission's name
   * 
   * @param chatThread chat thread
   * @param scope scope
   * @return chat thread scope permission's name
   */
  private getPermissionName(chatThread: ThreadModel, scope: ApplicationScope) {
    return `${scope}-${chatThread.id}`;
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

  /**
   * Returns thread summary report as xlsx
   * 
   * @param {http.ClientRequest} req client request object
   * @param {http.ServerResponse} res server response object
   * @param {Object} thread thread 
   */
  private async sendChatThreadSummaryReportXLSX(req: Request, res: Response, thread: ThreadModel) {
    const predefinedTexts = (await models.listThreadPredefinedTextsByThreadId(thread.id)).map((predefinedText: ThreadPredefinedTextModel) => {
      return predefinedText.text;
    });

    const messages = await models.listMessagesByThreadId(thread.id);
    messages.sort((a, b) => {
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    const predefinedTextCounts = {};

    const userAnswerMap: { [key: string]: string } = {};

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const answer = message.contents ? _.trim(message.contents) : null;
      if (answer) {
        userAnswerMap[message.userId] = answer;
      }
    }

    const userAnswers = Object.values(userAnswerMap);

    for (let i = 0; i < userAnswers.length; i++) {
      const userAnswer = userAnswers[i];
      predefinedTextCounts[userAnswer] = (predefinedTextCounts[userAnswer] || 0) + 1;  
    }

    const otherAnswers = _.without.apply(_, [userAnswers].concat(predefinedTexts));
          
    const columnHeaders = [
      i18n.__("chatThreadSummaryReport.answer"),
      i18n.__("chatThreadSummaryReport.count")
    ];

    const rows = [];
    for (let i = 0; i < predefinedTexts.length; i++) {
      const predefinedText = predefinedTexts[i];
      rows.push([predefinedText, predefinedTextCounts[predefinedText] || 0]);
    }

    if (otherAnswers.length > 0) {
      rows.push([]);
      rows.push(["Muut vastaukset"]);
      rows.push([]);
    }

    for (let i = 0; i < otherAnswers.length; i++) {
      rows.push([otherAnswers[i]]);
    }

    const name = "summary-report";
    const filename =`${slugify(name)}.xlsx`;

    res.setHeader("Content-disposition", `attachment; filename=${filename}`);
    res.status(200).send(excel.buildXLSX(name, columnHeaders, rows));
  }


  /**
   * Translates application scope into REST scope
   * 
   * @param scope scope to be translated
   * @returns translated scope
   */
  private translatePermissionScope(scope: ChatThreadPermissionScope | null): ApplicationScope | null {
    if (!scope) {
      return null;
    }

    switch (scope) {
      case "ACCESS":
        return "chat-thread:access";
    }

    return null;
  }

  /**
   * Translates application scope into REST scope
   * 
   * @param scope scope to be translated
   * @returns translated scope
   */
  private translateApplicationScope(scope: ApplicationScope | null): ChatThreadPermissionScope | null {
    if (!scope) {
      return null;
    }

    switch (scope) {
      case "chat-thread:access":
        return "ACCESS";
    }

    return null;
  }

  /**
   * Translates database chat thread into REST chat thread 
   * 
   * @param {Object} databaseChatThread database chat thread
   */
  private async translateChatThread(databaseChatThread: ThreadModel, databaseChatGroup: ChatGroupModel) {
    let answerType: ChatThread.AnswerTypeEnum;

    if (databaseChatThread.answerType == "POLL") {
      answerType = "POLL";
    } else {
      answerType = "TEXT";
    } 

    const title = databaseChatGroup.type == "QUESTION" && databaseChatThread.ownerId 
      ? userManagement.getUserDisplayName(await userManagement.findUser(databaseChatThread.ownerId)) 
      : databaseChatThread.title;

    const result: ChatThread = {
      id: databaseChatThread.id,
      title: title,
      description: databaseChatThread.description,
      imageUrl: databaseChatThread.imageUrl,
      groupId: databaseChatThread.groupId,
      answerType: answerType,
      expiresAt: databaseChatThread.expiresAt || null,
      pollAllowOther: databaseChatThread.pollAllowOther
    };

    return result;
  }


}
