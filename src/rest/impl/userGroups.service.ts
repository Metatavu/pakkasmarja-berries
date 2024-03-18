import * as _ from "lodash";
import { Request, Response } from "express";
import UserGroupsService from "../api/userGroups.service";
import { UserGroup } from "../model/models";
import userManagement from "../../user-management";
import ApplicationRoles from "../application-roles";
import { GroupRepresentation } from "@keycloak-admin-client/models";

/**
 * Chat Groups REST service
 */
export default class UserGroupsServiceImpl extends UserGroupsService {

  /**
   * @inheritdoc
   */
  public async listUserGroups(req: Request, res: Response): Promise<void> {
    if (!this.hasRealmRole(req, ApplicationRoles.CREATE_CHAT_GROUPS)) {
      this.sendForbidden(res, "You do not have permission to list user groups");
      return;
    }

    const userGroups = await userManagement.listGroups();

    res.status(200).send(userGroups.map((userGroup) => {
      return this.translateUserGroup(userGroup);
    }));
  }

  private translateUserGroup(userGroup: GroupRepresentation): UserGroup | null {
    if (!userGroup || !userGroup.id || !userGroup.name) {
      return null;
    }

    return {
      id: userGroup.id,
      name: userGroup.name
    };
  }

}