import * as _ from "lodash";
import { Request, Response } from "express";
import ChatGroupsService from "../api/chatGroups.service";
import models, { ChatGroupModel } from "../../models";
import { ChatGroupType, ChatGroup } from "../model/models";
import mqtt from "../../mqtt";

/**
 * Chat Groups REST service
 */
export default class ChatGroupsServiceImpl extends ChatGroupsService {

  /**
   * @inheritdoc
   */
  public async createChatGroup(req: Request, res: Response): Promise<void> {
    // TODO: Secure

    const payload: ChatGroup = req.body;
    let type = this.getGroupType(payload.type);
    if (!type) {
      this.sendBadRequest(res, `Invalid type ${payload.type}`);
      return;
    }

    const chatGroup = await models.createChatGroup(type, payload.title, payload.imageUrl);

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
    // TODO: Secure

    const chatGroupId = parseInt(req.params.chatGroupId);
    const group = await models.findChatGroup(chatGroupId);
    if (!group) {
      this.sendNotFound(res);
      return;
    }

    await models.deleteChatGroup(chatGroupId);

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
    // TODO: Secure
        
    const chatGroupId = req.params.chatGroupId;
    const group = await models.findChatGroup(chatGroupId);
    if (!group) {
      this.sendNotFound(res);
      return;
    }

    res.status(200).send(this.translateChatGroup(group));
  }

  /**
   * @inheritdoc
   */
  public async listChatGroups(req: Request, res: Response): Promise<void> {
    // TODO: Secure

    const groupType: ChatGroupType = req.query.groupType;

    const groups = await models.listChatGroups(groupType);

    res.status(200).send(groups.map((group) => {
      return this.translateChatGroup(group);
    }));
  }

  /**
   * @inheritdoc
   */
  public async updateChatGroup(req: Request, res: Response): Promise<void> {
    // TODO: Secure

    const payload: ChatGroup = req.body;
    let type = this.getGroupType(payload.type);
    if (!type) {
      this.sendBadRequest(res, `Invalid type ${payload.type}`);
      return;
    }
        
    const chatGroupId = parseInt(req.params.chatGroupId);
    const group = await models.findChatGroup(chatGroupId);
    if (!group) {
      this.sendNotFound(res);
      return;
    }

    await models.updateChatGroup(chatGroupId, payload.title, payload.imageUrl);

    mqtt.publish("chatgroups", {
      "operation": "UPDATED",
      "id": chatGroupId
    });

    res.status(200).send(this.translateChatGroup(group));
    
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
