import * as _ from "lodash";
import { Request, Response } from "express";
import ChatGroupsService from "../api/chatGroups.service";
import models, { ChatGroupModel } from "../../models";
import { ChatGroupType, ChatGroup } from "../model/models";
import mqtt from "../../mqtt";
import { CHAT_GROUP_MANAGE, CHAT_GROUP_ACCESS, CHAT_GROUP_TRAVERSE, ApplicationScope } from "../application-scopes";
import { Promise } from "bluebird";
import ApplicationRoles from "../application-roles";
import userManagement from "../../user-management";
import { ChatGroupGroupPermission } from "../model/chatGroupGroupPermission";
import { ChatGroupPermissionScope } from "../model/chatGroupPermissionScope";
import ResourceRepresentation from "keycloak-admin/lib/defs/resourceRepresentation";
import GroupPolicyRepresentation from "keycloak-admin/lib/defs/groupPolicyRepresentation";
import GroupRepresentation from "keycloak-admin/lib/defs/groupRepresentation";
import { DecisionStrategy } from "keycloak-admin/lib/defs/policyRepresentation";

const CHAT_GROUP_SCOPES: ApplicationScope[] = ["chat-group:manage", "chat-group:access", "chat-group:traverse"];

/**
 * Chat Groups REST service
 */
export default class ChatGroupsServiceImpl extends ChatGroupsService {

  /**
   * @inheritdoc
   */
  public async createChatGroup(req: Request, res: Response): Promise<void> {
    if (!this.hasRealmRole(req, ApplicationRoles.CREATE_CHAT_GROUPS)) {
      this.sendForbidden(res, "You do not have permission to create chat groups");
      return;
    }

    const payload: ChatGroup = req.body;
    let type = this.getGroupType(payload.type);
    if (!type) {
      this.sendBadRequest(res, `Invalid type ${payload.type}`);
      return;
    }

    const chatGroup = await models.createChatGroup(type, payload.title, payload.imageUrl);
    const resource = await this.createChatGroupResource(chatGroup);
    const chatAdminPolicy = await userManagement.findRolePolicyByName("chat-admin");
    
    if (!chatAdminPolicy || !chatAdminPolicy.id) {
      this.sendInternalServerError(res, "Failed to lookup chat admin policy");
      return;
    }

    await this.createChatGroupPermission(chatGroup, resource, "chat-group:access", []);
    await this.createChatGroupPermission(chatGroup, resource, "chat-group:manage", [ chatAdminPolicy.id ]);
    await this.createChatGroupPermission(chatGroup, resource, "chat-group:traverse", []);

    res.status(200).send(this.translateChatGroup(chatGroup));

    mqtt.publish("chatgroups", {
      "operation": "CREATED",
      "id": chatGroup.id
    });
  }

  /**
   * @inheritdoc
   */
  public async deleteChatGroup(req: Request, res: Response): Promise<void> {
    const chatGroupId = parseInt(req.params.chatGroupId);
    const chatGroup = await models.findChatGroup(chatGroupId);
    if (!chatGroup) {
      this.sendNotFound(res);
      return;
    }

    if (!(await this.hasResourcePermission(req, this.getChatGroupResourceName(chatGroup), [CHAT_GROUP_MANAGE]))) {
      this.sendForbidden(res);
      return;
    }

    await models.deleteChatGroup(chatGroupId);

    await this.deletePermission(this.getPermissionName(chatGroup, "chat-group:access"));
    await this.deletePermission(this.getPermissionName(chatGroup, "chat-group:manage"));
    await this.deletePermission(this.getPermissionName(chatGroup, "chat-group:traverse"));

    mqtt.publish("chatgroups", {
      "operation": "DELETED",
      "id": chatGroupId
    });

    res.status(204).send();
  }

  /**
   * @inheritdoc
   */
  public async findChatGroup(req: Request, res: Response): Promise<void> {
    const chatGroupId = req.params.chatGroupId;
    const chatGroup = await models.findChatGroup(chatGroupId);
    if (!chatGroup) {
      this.sendNotFound(res);
      return;
    }

    if (!(await this.hasResourcePermission(req, this.getChatGroupResourceName(chatGroup), [CHAT_GROUP_ACCESS, CHAT_GROUP_TRAVERSE]))) {
      this.sendForbidden(res);
      return;
    }
    
    res.status(200).send(this.translateChatGroup(chatGroup));
  }

  /**
   * @inheritdoc
   */
  public async listChatGroups(req: Request, res: Response): Promise<void> {
    const groupType: ChatGroupType = req.query.groupType;

    const chatGroups = await Promise.all(Promise.filter(models.listChatGroups(groupType), (chatGroup) => {
      return this.hasResourcePermission(req, this.getChatGroupResourceName(chatGroup), [CHAT_GROUP_ACCESS, CHAT_GROUP_TRAVERSE]);
    }));

    res.status(200).send(chatGroups.map((chatGroup) => {
      return this.translateChatGroup(chatGroup);
    }));
  }

  /**
   * @inheritdoc
   */
  public async updateChatGroup(req: Request, res: Response): Promise<void> {
    const payload: ChatGroup = req.body;
    let type = this.getGroupType(payload.type);
    if (!type) {
      this.sendBadRequest(res, `Invalid type ${payload.type}`);
      return;
    }
        
    const chatGroupId = parseInt(req.params.chatGroupId);
    const chatGroup = await models.findChatGroup(chatGroupId);
    if (!chatGroup) {
      this.sendNotFound(res);
      return;
    }

    if (!(await this.hasResourcePermission(req, this.getChatGroupResourceName(chatGroup), [CHAT_GROUP_MANAGE]))) {
      this.sendForbidden(res);
      return;
    }

    await models.updateChatGroup(chatGroupId, payload.title, payload.type, payload.imageUrl);

    mqtt.publish("chatgroups", {
      "operation": "UPDATED",
      "id": chatGroupId
    });

    res.status(200).send(this.translateChatGroup(await models.findChatGroup(chatGroupId)));
  }

  /**
   * @inheritdoc
   */
  public async createChatGroupGroupPermissions(req: Request, res: Response): Promise<void> {
    if (!this.hasRealmRole(req, ApplicationRoles.CREATE_CHAT_GROUPS)) {
      this.sendForbidden(res, "You do not have permission to create chat groups");
      return;
    }

    const body: ChatGroupGroupPermission = req.body;
    const chatGroupId = parseInt(req.params.chatGroupId);
    const chatGroup = await models.findChatGroup(chatGroupId);
    if (!chatGroup) {
      this.sendNotFound(res);
      return;
    }

    const userGroupId = body.userGroupId;
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

    await this.setUserGroupChatGroupScope(chatGroup, userGroup, scope);

    const result: ChatGroupGroupPermission = {
      chatGroupId: chatGroup.id,
      userGroupId: userGroup.id,
      id: this.getChatGroupGroupPermissionId(chatGroupId, userGroup.id),
      scope: body.scope
    };

    res.status(200).send(result);
  }

  /**
   * @inheritdoc
   */
  public async listChatGroupGroupPermissions(req: Request, res: Response): Promise<void> {
    if (!this.hasRealmRole(req, ApplicationRoles.CREATE_CHAT_GROUPS)) {
      this.sendForbidden(res, "You do not have permission to create chat groups");
      return;
    }

    const chatGroupId = parseInt(req.params.chatGroupId);
    const chatGroup = await models.findChatGroup(chatGroupId);
    if (!chatGroup) {
      this.sendNotFound(res);
      return;
    }

    const userGroups = await userManagement.listGroups(0, 999);
    
    const result = (await Promise.all(userGroups.map(async (userGroup) => {      
      const scope = this.translateApplicationScope(await this.getUserGroupChatGroupScope(chatGroup, userGroup));
      if (!scope) {
        return null;
      }

      const result: ChatGroupGroupPermission = {
        chatGroupId: chatGroup.id,
        userGroupId: userGroup.id!,
        id: this.getChatGroupGroupPermissionId(chatGroupId, userGroup.id!),
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
  public async findChatGroupGroupPermissions(req: Request, res: Response): Promise<void> {
    if (!this.hasRealmRole(req, ApplicationRoles.CREATE_CHAT_GROUPS)) {
      this.sendForbidden(res, "You do not have permission to create chat groups");
      return;
    }

    const chatGroupId = parseInt(req.params.chatGroupId);
    const chatGroupPermissionId = req.params.permissionId;
    const chatGroup = await models.findChatGroup(chatGroupId);
    if (!chatGroup) {
      this.sendNotFound(res);
      return;
    }

    const userGroupId = this.getGroupPermissionIdUserGroupId(chatGroupPermissionId);
    if (!userGroupId) {
      this.sendInternalServerError(res, "Failed to extract userGroupId");
      return;
    }

    const userGroup = await userManagement.findGroup(userGroupId);
    if (!userGroup || !userGroup.id) {
      this.sendInternalServerError(res, "Could not find user group");
      return;
    }

    const scope = this.translateApplicationScope(await this.getUserGroupChatGroupScope(chatGroup, userGroup));
    if (!scope) {
      this.sendNotFound(res);
      return;      
    }
    
    const result: ChatGroupGroupPermission = {
      chatGroupId: chatGroup.id,
      userGroupId: userGroup.id,
      id: this.getChatGroupGroupPermissionId(chatGroupId, userGroup.id),
      scope: scope
    };

    res.status(200).send(result);
  }

  /**
   * @inheritdoc
   */
  public async updateChatGroupGroupPermissions(req: Request, res: Response): Promise<void> {
    if (!this.hasRealmRole(req, ApplicationRoles.CREATE_CHAT_GROUPS)) {
      this.sendForbidden(res, "You do not have permission to create chat groups");
      return;
    }

    const body: ChatGroupGroupPermission = req.body;
    const chatGroupId = parseInt(req.params.chatGroupId);
    const chatGroupPermissionId = req.params.permissionId;
    const chatGroup = await models.findChatGroup(chatGroupId);
    if (!chatGroup) {
      this.sendNotFound(res);
      return;
    }

    const userGroupId = this.getGroupPermissionIdUserGroupId(chatGroupPermissionId);
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

    await this.setUserGroupChatGroupScope(chatGroup, userGroup, scope);

    const result: ChatGroupGroupPermission = {
      chatGroupId: chatGroup.id,
      userGroupId: userGroup.id,
      id: this.getChatGroupGroupPermissionId(chatGroupId, userGroup.id),
      scope: body.scope
    };

    res.status(200).send(result);
  }

  /**
   * Sets a scope for given user group into given chat group
   * 
   * @param chatGroup chat group
   * @param userGroup user group
   * @param scope scope
   */
  private async setUserGroupChatGroupScope(chatGroup: ChatGroupModel, userGroup: GroupRepresentation, scope: ApplicationScope): Promise<null> {
    const groupPolicy = await this.resolveGroupPolicy(userGroup.id!);
    if (!groupPolicy) {
      return null;
    }

    for (let i = 0; i < CHAT_GROUP_SCOPES.length; i++) { 
      if (await this.hasChatGroupPermissionPolicy(chatGroup, CHAT_GROUP_SCOPES[i], groupPolicy)) {
        if (scope != CHAT_GROUP_SCOPES[i]) {
          await this.removeChatGroupPermissionPolicy(chatGroup, CHAT_GROUP_SCOPES[i], groupPolicy);
        }
      } else {
        if (scope == CHAT_GROUP_SCOPES[i]) {
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
  private async getUserGroupChatGroupScope(chatGroup: ChatGroupModel, userGroup: GroupRepresentation): Promise<ApplicationScope | null> {
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
   * Creates resource for a group resource
   * 
   * @param chatGroup chat group
   * @return created resource
   */
  private async createChatGroupResource(chatGroup: ChatGroupModel) {
    const resourceName = this.getChatGroupResourceName(chatGroup);
    const resourceUri = this.getChatGroupUri(chatGroup.id);
    return await this.createGroupResource(resourceName, resourceUri, "chat-group", [CHAT_GROUP_ACCESS, CHAT_GROUP_MANAGE]);
  }

  /**
   * Creates chat group permission
   * 
   * @param chatGroup chat group
   * @param resource resource
   * @param scope scope
   * @param policyIds policy ids
   */
  private createChatGroupPermission(chatGroup: ChatGroupModel, resource: ResourceRepresentation, scope: ApplicationScope, policyIds: string[]) {
    return userManagement.createScopePermission(this.getPermissionName(chatGroup, scope), [ resource.id || (resource as any)._id ], [ scope ], policyIds, DecisionStrategy.AFFIRMATIVE);
  }

  /**
   * Extracts user group id from group permission id 
   * 
   * @param groupPermissionId group permission id 
   * @return user group id
   */
  private getGroupPermissionIdUserGroupId(groupPermissionId: string): string | null {
    const match = /(chat-group.[0-9]{1,}-user-group-)([a-z0-9-]*)/.exec(groupPermissionId);
    return match ? match[2] || null : null;
  }

  /**
   * Returns chat group permission id
   * 
   * @param chatGroupId chat group id
   * @param userGroupId user group id
   * @return chat group permission id
   */
  private getChatGroupGroupPermissionId(chatGroupId: number, userGroupId: string) {
    return `chat-group-${chatGroupId}-user-group-${userGroupId}`;
  }

  /**
   * Returns chat group scope permission's name
   * 
   * @param chatGroup chat group
   * @param scope scope
   * @return chat group scope permission's name
   */
  private getPermissionName(chatGroup: ChatGroupModel, scope: ApplicationScope) {
    return `${scope}-${chatGroup.id}`;
  }

  /**
   * Translates REST chat group type into Database type
   * 
   * @param type type
   * @returns database type
   */
  private getGroupType(type: ChatGroupType): "CHAT" | "QUESTION" | null {
    if (type == "CHAT") {
      return "CHAT";
    } else if (type == "QUESTION") {
      return "QUESTION";
    }

    return null;
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

  /**
   * Translates application scope into REST scope
   * 
   * @param scope scope to be translated
   * @returns translated scope
   */
  private translateApplicationScope(scope: ApplicationScope | null): ChatGroupPermissionScope | null {
    if (!scope) {
      return null;
    }

    switch (scope) {
      case "chat-group:access":
        return "ACCESS";
      case "chat-group:manage":
        return "MANAGE";
      case "chat-group:traverse":
        return "TRAVERSE";
    }

    return null;
  }

  /**
   * Translates application scope into REST scope
   * 
   * @param scope scope to be translated
   * @returns translated scope
   */
  private translatePermissionScope(scope: ChatGroupPermissionScope | null): ApplicationScope | null {
    if (!scope) {
      return null;
    }

    switch (scope) {
      case "ACCESS":
        return "chat-group:access";
      case "MANAGE":
        return "chat-group:manage";
      case "TRAVERSE":
        return "chat-group:traverse";
    }

    return null;
  }

  /**
   * Translates database entity into REST entity
   * 
   * @param chatGroup database entity
   * @returns REST entity
   */
  private translateChatGroup(chatGroup: ChatGroupModel): ChatGroup | null {
    if (chatGroup == null) {
      return null
    }

    let type: ChatGroupType;
    if (chatGroup.type == "CHAT") {
      type = ChatGroupType.CHAT;
    } else {
      type = ChatGroupType.QUESTION;
    }

    const result: ChatGroup = {
      id: chatGroup.id,
      imageUrl: chatGroup.imageUrl,
      title: chatGroup.title,
      type: type
    }

    return result;
  }

}
