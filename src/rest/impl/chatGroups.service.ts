import * as _ from "lodash";
import { Request, Response } from "express";
import ChatGroupsService from "../api/chatGroups.service";
import models, { ChatGroupModel } from "../../models";
import { ChatGroupType, ChatGroup } from "../model/models";
  /**
   * Groups REST service
   */
export default class ChatGroupsServiceImpl extends ChatGroupsService {


  /**
   * Creates new chat group
   * @summary Creates new chat group
   * Accepted parameters:
    * - (body) ChatGroup body - Payload
  */
  public async createChatGroup(req: Request, res: Response): Promise<void> {
    
  }


 /**
  * Deletes a chat group
  * @summary Deletes a chat group
  * Accepted parameters:
   * - (path) number chatGroupId - Chat group id
 */
  public async deleteChatGroup(req: Request, res: Response): Promise<void> {
    
  }


 /**
  * Returns a chat group
  * @summary Returns a chat group
  * Accepted parameters:
   * - (path) number chatGroupId - Chat group id
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
  * Returns list of chat groups
  * @summary Returns list of chat groups
  * Accepted parameters:
   * - (query) ChatGroupType groupType - Filter chat groups by group type
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
  * Update chat group
  * @summary Update chat group
  * Accepted parameters:
   * - (body) ChatGroup body - Payload
   * - (path) number chatGroupId - Chat group id
 */
  public async updateChatGroup(req: Request, res: Response): Promise<void> {
    
  }

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
