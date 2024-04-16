import * as _ from "lodash";
import { Request, Response } from "express";
import ChatGroupsService from "../api/chatGroups.service";

/**
 * Chat Groups REST service
 */
export default class ChatGroupsServiceImpl extends ChatGroupsService {

  /**
   * @inheritdoc
   */
  public async createChatGroup(req: Request, res: Response): Promise<void> {
    res.sendStatus(501).send("Not implemented");
  }

  /**
   * @inheritdoc
   */
  public async deleteChatGroup(req: Request, res: Response): Promise<void> {
    res.sendStatus(501).send("Not implemented");
  }

  /**
   * @inheritdoc
   */
  public async findChatGroup(req: Request, res: Response): Promise<void> {
    res.sendStatus(501).send("Not implemented");
  }

  /**
   * @inheritdoc
   */
  public async listChatGroups(req: Request, res: Response): Promise<void> {
    res.sendStatus(501).send("Not implemented");
  }

  /**
   * @inheritdoc
   */
  public async updateChatGroup(req: Request, res: Response): Promise<void> {
    res.sendStatus(501).send("Not implemented");
  }

  /**
   * @inheritdoc
   */
  public async createChatGroupGroupPermissions(req: Request, res: Response): Promise<void> {
    res.sendStatus(501).send("Not implemented");
  }

  /**
   * @inheritdoc
   */
  public async listChatGroupGroupPermissions(req: Request, res: Response): Promise<void> {
    res.sendStatus(501).send("Not implemented");
  }

  /**
   * @inheritdoc
   */
  public async findChatGroupGroupPermissions(req: Request, res: Response): Promise<void> {
    res.sendStatus(501).send("Not implemented");
  }

  /**
   * @inheritdoc
   */
  public async updateChatGroupGroupPermissions(req: Request, res: Response): Promise<void> {
    res.sendStatus(501).send("Not implemented");
  }

  /**
   * @inheritdoc
   */
  public async deleteChatGroupGroupPermission(req: Request, res: Response): Promise<void> {
    res.sendStatus(501).send("Not implemented");
  }

}
