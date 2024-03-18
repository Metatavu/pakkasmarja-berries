import * as _ from "lodash";
import ChatMessagesService from "../api/chatMessages.service";
import { Request, Response } from "express";

/**
 * Messages REST service
 */
export default class ChatMessagesServiceImpl extends ChatMessagesService {

  /**
   * @inheritdoc
   */
  public async createChatMessage(req: Request, res: Response): Promise<void> {
    res.sendStatus(501).send("Not implemented");
  }

  /**
   * @inheritdoc
   */
  public async deleteChatMessage(req: Request, res: Response): Promise<void> {
    res.sendStatus(501).send("Not implemented");
  }

  /**
   * @inheritdoc
   */
  public async findChatMessage(req: Request, res: Response): Promise<void> {
    res.sendStatus(501).send("Not implemented");
  }

  /**
   * @inheritdoc
   */
  public async listChatMessages(req: Request, res: Response): Promise<void> {
    res.sendStatus(501).send("Not implemented");
  }

  /**
   * @inheritdoc
   */
  public async updateChatMessage(req: Request, res: Response): Promise<void> {
    res.sendStatus(501).send("Not implemented");
  }

  /**
   * @inheritdoc
   */
  public async getMessageReadAmount(req: Request, res: Response): Promise<void> {
    res.sendStatus(501).send("Not implemented");
  }

  /**
   * @inheritdoc
   */
  public async getMessageRead(req: Request, res: Response): Promise<void> {
    res.sendStatus(501).send("Not implemented");
  }

}