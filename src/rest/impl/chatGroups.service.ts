import * as _ from "lodash";
import { Request, Response } from "express";
import ChatGroupsService from "../api/chatGroups.service";
  /**
   * Threads REST service
   */
export default class ChatThreadsServiceImpl extends ChatGroupsService {


  /**
   * Creates new chat group
   * @summary Creates new chat group
   * Accepted parameters:
    * - (body) ChatThread body - Payload
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
    
  }


 /**
  * Returns list of chat groups
  * @summary Returns list of chat groups
  * Accepted parameters:
   * - (query) ChatGroupType groupType - Filter chat groups by group type
 */
  public async listChatGroups(req: Request, res: Response): Promise<void> {
    
  }


 /**
  * Update chat group
  * @summary Update chat group
  * Accepted parameters:
   * - (body) ChatThread body - Payload
   * - (path) number chatGroupId - Chat group id
 */
  public async updateChatGroup(req: Request, res: Response): Promise<void> {
    
  }



}
