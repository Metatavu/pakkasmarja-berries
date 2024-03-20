import * as _ from "lodash";
import ChatThreadsService from "../api/chatThreads.service";
import { Request, Response } from "express";

/**
 * Threads REST service
 */
export default class ChatThreadsServiceImpl extends ChatThreadsService {

  /**
   * @inheritdoc
   */
  public async createChatThreadGroupPermissions(req: Request, res: Response): Promise<void> {
    res.sendStatus(501).send("Not implemented");
  }

  /**
   * @inheritdoc
   */
  public async findChatThreadGroupPermission(req: Request, res: Response): Promise<void> {
    res.sendStatus(501).send("Not implemented");
  }

  /**
   * @inheritdoc
   */
  public async listChatThreadGroupPermissions(req: Request, res: Response): Promise<void> {
    res.sendStatus(501).send("Not implemented");
  }

  /**
   * @inheritdoc
   */
  public async updateChatThreadGroupPermission(req: Request, res: Response): Promise<void> {
    res.sendStatus(501).send("Not implemented");
  }

  /**
   * @inheritdoc
   */
  public async createChatThreadUserPermission(req: Request, res: Response): Promise<void> {
    res.sendStatus(501).send("Not implemented");
  }

  /**
   * @inheritdoc
   */
  public async findChatThreadUserPermission(req: Request, res: Response): Promise<void> {
    res.sendStatus(501).send("Not implemented");
  }

  /**
   * @inheritdoc
   */
  public async listChatThreadUserPermissions(req: Request, res: Response): Promise<void> {
    res.sendStatus(501).send("Not implemented");
  }

  /**
   * @inheritdoc
   */
  public async updateChatThreadUserPermission(req: Request, res: Response): Promise<void> {
    res.sendStatus(501).send("Not implemented");
  }

  /**
   * @inheritdoc
   */
  public async createChatThread(req: Request, res: Response): Promise<void> {
    res.sendStatus(501).send("Not implemented");
  }

  /**
   * @inheritdoc
   */
  public async deleteChatThread(req: Request, res: Response): Promise<void> {
    res.sendStatus(501).send("Not implemented");
  }

  /**
   * @inheritdoc
   */
  public async findChatThread(req: Request, res: Response): Promise<void> {
    res.sendStatus(501).send("Not implemented");
  }

  /**
   * @inheritdoc
   */
  public async listChatThreads(req: Request, res: Response): Promise<void> {
    res.sendStatus(501).send("Not implemented");
  }

  /**
   * @inheritdoc
   */
  public async updateChatThread(req: Request, res: Response): Promise<void> {
    res.sendStatus(501).send("Not implemented");
  }

  /**
   * @inheritdoc
   */
  public async getChatThreadReport(req: Request, res: Response) {
    res.sendStatus(501).send("Not implemented");
  }

}
