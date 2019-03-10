import * as _ from "lodash";
import { Request, Response } from "express";
import ChatGroupsService from "../api/chatGroups.service";
import models, { ChatGroupModel } from "../../models";
import { ChatGroupType, ChatGroup } from "../model/models";
import mqtt from "../../mqtt";
import { CHAT_GROUP_MANAGE, CHAT_GROUP_ACCESS } from "../application-scopes";
import { Promise } from "bluebird";
import ApplicationRoles from "../application-roles";

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
    await this.addOwnerPermission(this.getLoggedUserId(req), "chat-group", this.getChatGroupResourceName(chatGroup), this.getChatGroupUri(chatGroup.id), this.getOwnerPermissionName(chatGroup), [CHAT_GROUP_ACCESS, CHAT_GROUP_MANAGE]);

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
    await this.deletePermission(this.getOwnerPermissionName(chatGroup));

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

    if (!(await this.hasResourcePermission(req, this.getChatGroupResourceName(chatGroup), [CHAT_GROUP_ACCESS]))) {
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
      return this.hasResourcePermission(req, this.getChatGroupResourceName(chatGroup), [CHAT_GROUP_ACCESS]);
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
   * Returns owner permission's name for a group
   * 
   * @param chatGroup chat group
   * @return owner permission's name for a group
   */
  private getOwnerPermissionName(chatGroup: ChatGroupModel) {
    return `chat-group-${chatGroup.id}-owner`;
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
