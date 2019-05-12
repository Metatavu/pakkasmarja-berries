import * as _ from "lodash";
import { Request, Response } from "express";
import ChatGroupsService from "../api/chatGroups.service";
import models, { ChatGroupModel } from "../../models";
import { ChatGroupType, ChatGroup } from "../model/models";
import mqtt from "../../mqtt";
import { Promise } from "bluebird";
import ApplicationRoles from "../application-roles";
import userManagement from "../../user-management";
import { ChatGroupGroupPermission } from "../model/chatGroupGroupPermission";
import { ChatGroupPermissionScope } from "../model/chatGroupPermissionScope";
import chatGroupPermissionController from "../../user-management/chat-group-permission-controller";
import { CHAT_GROUP_MANAGE, CHAT_GROUP_ACCESS, CHAT_GROUP_TRAVERSE, ApplicationScope } from "../application-scopes";

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
    const resource = await chatGroupPermissionController.createChatGroupResource(chatGroup);
    const chatAdminPolicy = await userManagement.findRolePolicyByName("chat-admin");
    
    if (!chatAdminPolicy || !chatAdminPolicy.id) {
      this.sendInternalServerError(res, "Failed to lookup chat admin policy");
      return;
    }

    await chatGroupPermissionController.createChatGroupPermission(chatGroup, resource, "chat-group:access", []);
    await chatGroupPermissionController.createChatGroupPermission(chatGroup, resource, "chat-group:manage", [ chatAdminPolicy.id ]);
    await chatGroupPermissionController.createChatGroupPermission(chatGroup, resource, "chat-group:traverse", []);

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

    if (!(await this.hasResourcePermission(req, chatGroupPermissionController.getChatGroupResourceName(chatGroup), [CHAT_GROUP_MANAGE]))) {
      this.sendForbidden(res);
      return;
    }

    await models.deleteChatGroup(chatGroupId);

    await chatGroupPermissionController.deletePermission(chatGroupPermissionController.getPermissionName(chatGroup, "chat-group:access"));
    await chatGroupPermissionController.deletePermission(chatGroupPermissionController.getPermissionName(chatGroup, "chat-group:manage"));
    await chatGroupPermissionController.deletePermission(chatGroupPermissionController.getPermissionName(chatGroup, "chat-group:traverse"));

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

    if (!(await this.hasResourcePermission(req, chatGroupPermissionController.getChatGroupResourceName(chatGroup), [CHAT_GROUP_MANAGE, CHAT_GROUP_ACCESS, CHAT_GROUP_TRAVERSE]))) {
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
      return this.hasResourcePermission(req, chatGroupPermissionController.getChatGroupResourceName(chatGroup), [CHAT_GROUP_MANAGE, CHAT_GROUP_ACCESS, CHAT_GROUP_TRAVERSE]);
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

    if (!(await this.hasResourcePermission(req, chatGroupPermissionController.getChatGroupResourceName(chatGroup), [CHAT_GROUP_MANAGE]))) {
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

    await chatGroupPermissionController.setUserGroupChatGroupScope(chatGroup, userGroup, scope);

    const result: ChatGroupGroupPermission = {
      chatGroupId: chatGroup.id,
      userGroupId: userGroup.id,
      id: chatGroupPermissionController.getChatGroupGroupPermissionId(chatGroupId, userGroup.id),
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
      const scope = this.translateApplicationScope(await chatGroupPermissionController.getUserGroupChatGroupScope(chatGroup, userGroup));
      if (!scope) {
        return null;
      }

      const result: ChatGroupGroupPermission = {
        chatGroupId: chatGroup.id,
        userGroupId: userGroup.id!,
        id: chatGroupPermissionController.getChatGroupGroupPermissionId(chatGroupId, userGroup.id!),
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

    const userGroupId = chatGroupPermissionController.getGroupPermissionIdUserGroupId(chatGroupPermissionId);
    if (!userGroupId) {
      this.sendInternalServerError(res, "Failed to extract userGroupId");
      return;
    }

    const userGroup = await userManagement.findGroup(userGroupId);
    if (!userGroup || !userGroup.id) {
      this.sendInternalServerError(res, "Could not find user group");
      return;
    }

    const scope = this.translateApplicationScope(await chatGroupPermissionController.getUserGroupChatGroupScope(chatGroup, userGroup));
    if (!scope) {
      this.sendNotFound(res);
      return;      
    }
    
    const result: ChatGroupGroupPermission = {
      chatGroupId: chatGroup.id,
      userGroupId: userGroup.id,
      id: chatGroupPermissionController.getChatGroupGroupPermissionId(chatGroupId, userGroup.id),
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

    const userGroupId = chatGroupPermissionController.getGroupPermissionIdUserGroupId(chatGroupPermissionId);
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

    await chatGroupPermissionController.setUserGroupChatGroupScope(chatGroup, userGroup, scope);

    const result: ChatGroupGroupPermission = {
      chatGroupId: chatGroup.id,
      userGroupId: userGroup.id,
      id: chatGroupPermissionController.getChatGroupGroupPermissionId(chatGroupId, userGroup.id),
      scope: body.scope
    };

    res.status(200).send(result);
  }

  /**
   * @inheritdoc
   */
  public async deleteChatGroupGroupPermission(req: Request, res: Response): Promise<void> {
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

    const userGroupId = chatGroupPermissionController.getGroupPermissionIdUserGroupId(chatGroupPermissionId);
    if (!userGroupId) {
      this.sendInternalServerError(res, "Failed to extract userGroupId");
      return;
    }

    const userGroup = await userManagement.findGroup(userGroupId);
    if (!userGroup || !userGroup.id) {
      this.sendInternalServerError(res, "Could not find user group");
      return;
    }

    await chatGroupPermissionController.setUserGroupChatGroupScope(chatGroup, userGroup, null);

    res.status(204).send();
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
