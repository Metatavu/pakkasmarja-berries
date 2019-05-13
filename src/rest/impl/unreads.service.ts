import * as _ from "lodash";
import { Request, Response } from "express";
import UnreadsService from "../api/unreads.service";
import { Unread } from "../model/models";
import userManagement from "../../user-management";
import GroupRepresentation from "keycloak-admin/lib/defs/groupRepresentation";
import ApplicationRoles from "../application-roles";
import models, { UnreadModel } from "../../models";

/**
 * Unread REST service
 */
export default class UnreadsServiceImpl extends UnreadsService {

  /**
   * @inheritdoc
   */
  public async deleteUnread(req: Request,  res: Response): Promise<void> {
    const unreadId: string = req.params.unreadId;

    const unread = await models.findUnreadById(unreadId);
    if (!unread || !unread.id) {
      this.sendNotFound(res);
      return;
    }

    const loggedUserId = this.getLoggedUserId(req);

    if (unread.userId != loggedUserId) {
      this.sendForbidden(res);
      return;
    }

    models.deleteUnread(unread.id);

    res.status(204).send();
  } 

  /**
   * @inheritdoc
   */
  public async listUnreads(req: Request, res: Response): Promise<void> {
    const pathPrefix = req.query.pathPrefix;
    const loggedUserId = this.getLoggedUserId(req);
    let userId = req.query.userId;

    if (!userId) {
      userId = loggedUserId;
    }

    if (userId != loggedUserId) {
      this.sendForbidden(res);
      return;
    }

    if (!pathPrefix) {
      this.sendBadRequest(res, "pathPrefix is required");
      return;
    }

    const unreads = await models.listUnreadsByPathLikeAndUserId(`${pathPrefix}%`, userId);

    res.send(unreads.map((unread) => {
      return this.translateUnread(unread);
    }));
  }

  /**
   * Translates Unread for REST
   * 
   * @param entity database entity
   * @return rest entity
   */
  private translateUnread(entity: UnreadModel | null): Unread | null {
    if (!entity) {
      return null;
    }

    const result: Unread = {
      id: entity.id,
      path: entity.path,
      createdAt: entity.createdAt,
      userId: entity.userId
    }
    
    return result;
  }

}