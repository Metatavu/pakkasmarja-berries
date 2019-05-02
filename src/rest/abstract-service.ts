import * as _ from "lodash";
import { Response, Request } from "express";
import { BadRequest } from './model/badRequest';
import { NotFound } from './model/notFound';
import { Forbidden } from './model/forbidden';
import { InternalServerError } from './model/internalServerError';
import { NotImplemented } from "./model/models";
import { getLogger, Logger } from "log4js";
import userManagement from "../user-management";
import { ApplicationScope, CHAT_GROUP_MANAGE, CHAT_GROUP_ACCESS, CHAT_THREAD_ACCESS } from "./application-scopes";
import ResourceRepresentation from "keycloak-admin/lib/defs/resourceRepresentation";
import PolicyRepresentation, { DecisionStrategy } from "keycloak-admin/lib/defs/policyRepresentation";
import { ChatGroupModel, ThreadModel } from "src/models";
import moment = require("moment");
import GroupPolicyRepresentation from "keycloak-admin/lib/defs/groupPolicyRepresentation";

/**
 * Abstract base class for all REST services
 */
export default class AbstractService {

  private baseLogger: Logger = getLogger();

  /**
   * Grants user an owner permission to given resource
   * 
   * @param userId user id
   * @param resourceType resource type
   * @param resourceName resource name
   * @param resourceUri resource URI
   * @param permissionName permission's name
   */
  protected async addOwnerPermission(userId: string, resourceType: string, resourceName: string, resourceUri: string, permissionName: string, scopes: ApplicationScope[]) {
    const resource = await this.createGroupResource(resourceName, resourceUri, resourceType, scopes);
    const policy = await this.createUserPolicy(userId);
    const permission = await userManagement.findPermissionByName(permissionName);
    if (permission) {
      await userManagement.deletePermission(permission.id!);
    }
    
    return await this.createScopePermission(permissionName, resource, scopes, policy);
  }

  /**
   * Finds or creates group policies for given group ids
   * 
   * @param userGroupId user group id
   * @returns promise for group policy
   */
  protected async resolveGroupPolicy(userGroupId: string): Promise<GroupPolicyRepresentation> {
    const policyName = `user-group-${userGroupId}`;
    const policy = await userManagement.findGroupPolicyByName(policyName);
    if (policy) {
      return policy;
    }

    return userManagement.createGroupPolicy(policyName, [ userGroupId ]);
  }

  /**
   * Deletes a permission
   * 
   * @param name permission name
   * @return promise for deletion
   */
  protected async deletePermission(name: string) {
    const permission = await userManagement.findPermissionByName(name);
    if (permission && permission.id) {
      this.deletePermissionById(permission.id);
    }
  }

  /**
   * Deletes a permission
   * 
   * @param permissionId permission id
   * @return promise for deletion
   */
  protected deletePermissionById(permissionId: string) {
    return userManagement.deletePermission(permissionId);
  }

  /**
   * Checks whether given access token has required scopes
   * 
   * @param req request
   * @param resourceName resource name 
   * @param scopes required scopes
   * @return Promise for whether user has permission to resource or not 
   */
  protected hasResourcePermission(req: Request, resourceName: string, scopes: ApplicationScope[]) {
    const accessToken = (req as any).kauth.grant.access_token;    
    return userManagement.hasResourcePermission(resourceName, scopes, accessToken.token);
  }

  /**
   * Creates scope permission
   * 
   * @param name name
   * @param resource resource
   * @param scopes scopes
   * @param policy policy
   * @return created permission
   */
  protected async createScopePermission(name: string, resource: ResourceRepresentation, scopes: ApplicationScope[], policy: PolicyRepresentation) {
    return userManagement.createScopePermission(name, [ resource.id || (resource as any)._id ], scopes, [ policy.id! ], DecisionStrategy.AFFIRMATIVE);
  }

  /**
   * Finds or creates an user policy
   * 
   * @param userId user id
   * @returns promise for user policy
   */
  protected async createUserPolicy(userId: string) {
    const name = `user-${userId}`;
    
    let result = await userManagement.findUserPolicyByName(name);
    if (!result) {
      result = await userManagement.createUserPolicy(name, [ userId ]);
    }

    return result;
  }

  /**
   * Finds or creates new group resource into the Keycloak
   * 
   * @param id group id 
   * @returns promise for group resource
   */
  protected async createGroupResource (name: string, uri: string, type: string, scopes: ApplicationScope[]): Promise<ResourceRepresentation> {
    let resource = await userManagement.findResourceByUri(uri);        
    if (!resource) {
      resource = await userManagement.createResource(name, name, uri, type, scopes);
    } 

    return resource!;
  }

  /**
   * Returns whether logged user has access permission to given thread
   * 
   * @param req request
   * @param thread thread
   * @param chatGroup chat group
   */
  protected async isThreadAccessPermission(req: Request, thread: ThreadModel, chatGroup: ChatGroupModel) {
    if (await this.hasResourcePermission(req, this.getChatGroupResourceName(chatGroup), [CHAT_GROUP_MANAGE, CHAT_GROUP_ACCESS])) {
      return true;
    }

    if (await this.hasResourcePermission(req, this.getChatThreadResourceName(thread), [CHAT_THREAD_ACCESS])) {
      return true;
    }

    return false;
  }

  /**
   * Returns whether logged user has manage permission to given thread
   * 
   * @param req request
   * @param thread thread
   * @param chatGroup chat group
   */
  protected async isThreadManagePermission(req: Request, thread: ThreadModel, chatGroup: ChatGroupModel) {
    if (await this.hasResourcePermission(req, this.getChatGroupResourceName(chatGroup), [CHAT_GROUP_MANAGE])) {
      return true;
    }

    return false;
  }

  /**
   * Returns resource name for a thread
   * 
   * @param chatThread chat thread
   * @return resource name for a thread
   */
  protected getChatThreadResourceName(chatThread: ThreadModel) {
    return `chat-thread-${chatThread.id}`;
  }

  /**
   * Returns associated permission policy ids for given permission 
   * 
   * @param permissionName name of permission
   * @return associated permission policy ids
   */
  protected async getPermissionNamePolicyIds(permissionName: string): Promise<string[]> {
    return this.getPermissionPolicyIds(await userManagement.findPermissionByName(permissionName));
  }

  /**
   * Returns whether group policy is associated with given permission
   * 
   * @param permission permission
   * @param groupPolicy group policy
   * @return whether group policy is associated with given permission
   */
  protected async hasPermissionPolicy(permission: PolicyRepresentation, groupPolicy: GroupPolicyRepresentation): Promise<boolean> {
    const policyIds = await this.getPermissionPolicyIds(permission);
    return policyIds.includes(groupPolicy.id!);
  }

  /**
   * Returns associated permission policy ids for given permission 
   * 
   * @param permissionName name of permission
   * @return associated permission policy ids
   */
  protected async getPermissionPolicyIds(permission: PolicyRepresentation | null): Promise<string[]> {
    if (!permission) {
      return [];
    }

    const policies = await userManagement.listAuthzPermissionAssociatedPolicies(permission.id!);
    
    return policies.map((policy) => {
      return policy.id!;
    });
  }

  /**
   * Adds a policy to scope permission
   * 
   * @param permissionName name of permission
   * @param groupPolicy policy
   */
  protected async addPermissionPolicy(permissionName: string, groupPolicy: GroupPolicyRepresentation) {
    const permission = await userManagement.findPermissionByName(permissionName);
    if (!permission || !permission.id) {
      return;
    }

    const policyIds = await this.getPermissionPolicyIds(permission);
    permission.policies = policyIds.concat([groupPolicy.id!]);
    
    return await userManagement.updateScopePermission(permission.id, permission);
  }

  /**
   * Removes a policy from chat group scope permission
   * 
   * @param permissionName name of permission
   * @param groupPolicy policy
   */
  protected async removePermissionPolicy(permissionName: string, groupPolicy: GroupPolicyRepresentation) {
    const permission = await userManagement.findPermissionByName(permissionName);
    if (!permission || !permission.id) {
      return;
    }

    const policyIds = await this.getPermissionPolicyIds(permission);
    permission.policies = _.without(policyIds, groupPolicy.id! );

    return await userManagement.updateScopePermission(permission.id, permission);
  }

  /**
   * Returns resource name for a group
   * 
   * @param chatGroup chat group
   * @return resource name for a group
   */
  protected getChatGroupResourceName(chatGroup: ChatGroupModel) {
    return `chat-group-${chatGroup.id}`;
  }
  
  /**
   * Gets accesstoken from request
   * 
   * @param {object} req express request
   * @returns access token
   */
  protected getAccessToken(req: Request) {
    const kauth = (req as any).kauth;
    if (kauth && kauth.grant && kauth.grant.access_token) {
      return kauth.grant.access_token;
    }
    
    return null;   
  }

  /**
   * Gets user id from request
   * 
   * @param {object} req express request
   * @returns user id
   */
  protected getLoggedUserId(req: Request) {
    const accessToken = this.getAccessToken(req);
    return accessToken && accessToken.content ? accessToken.content.sub : null;
  }

  /**
   * Returns whether user has specified realm role or not 
   * 
   * @param {object} req express request
   * @param {String} role realm role 
   */
  protected hasRealmRole(req: Request, role: string) {
    const accessToken = this.getAccessToken(req);
    return accessToken.hasRealmRole(role);
  }

  /**
   * Catch unhandled promise errors
   * 
   * @param {function} handler handler function
   * @return {Function} decorated handler function
   */
  protected catchAsync(handler: (req: Request, res: Response) => void) {
    return (req: Request, res: Response) => {
      try {
        return Promise.resolve(handler(req, res)).catch((err) => {
          this.baseLogger.error(`${req.method} request into ${req.path} failed in error`, err);
          res.status(500).send(err);
        });
      } catch (e) {
        this.baseLogger.error(`${req.method} request into ${req.path} failed with exception`, e);
        return null;
      }
    };
  }

  /**
   * Converts swagger path into a route path
   * 
   * @param {String} path swagger path
   * @return {String} route path
   */
  protected toPath(path: string) {
    return path.replace(/\$\{encodeURIComponent\(String\((.*?)\)\)\}/g, (match, param) => { 
      return `:${param}`;
    });
  }

  /**
   * Responds with 404 - not found
   * 
   * @param {http.ServerResponse} res server response object
   */
  protected sendNotFound(res: Response, message?: string) {
    const response: NotFound = {
      "code": 404,
      "message": message || "Not found"
    };

    res.status(404).send(response);
  }

  /**
   * Responds with 400 - bad request
   * 
   * @param {http.ServerResponse} res server response object
   * @param {String} message (optional)
   */
  protected sendBadRequest(res: Response, message?: string) {
    const response: BadRequest = {
      "code": 400,
      "message": message || "Bad Request"
    };

    this.baseLogger.warn(`Bad request with message ${message || "Bad Request"}`);

    res.status(400).send(response);
  }

  /**
   * Responds with 409 - conflict
   * 
   * @param {http.ServerResponse} res server response object
   * @param {String} message (optional)
   */
  protected sendConflict(res: Response, message?: string) {
    const response: BadRequest = {
      "code": 409,
      "message": message || "Conflict"
    };

    this.baseLogger.warn(`Conflict with message ${message || "Conflict"}`);

    res.status(409).send(response);
  }

  /**
   * Responds with 403 - forbidden
   * 
   * @param {http.ServerResponse} res server response object
   * @param {String} message (optional)
   */
  protected sendForbidden(res: Response, message?: string) {
    const response: Forbidden = {
      "code": 403,
      "message": message || "Forbidden"
    };

    res.status(403).send(response);
  }

  /**
   * Responds with 500 - internal server error
   * 
   * @param {http.ServerResponse} res server response object
   * @param {String} message (optional)
   */
  protected sendInternalServerError(res: Response, error? : string|Error) {
    const message = error instanceof Error ? (error as Error).message : error;
    const response: InternalServerError = {
      "code": 500,
      "message": message || "Internal Server Error"
    };

    this.baseLogger.warn(`Internal Server Error with message ${message || "Internal Server Error"}`);

    res.status(500).send(response);
  }

  /**
   * Responds with 501 - not implemented
   * 
   * @param {http.ServerResponse} res server response object
   * @param {String} message (optional)
   */
  protected sendNotImplemented(res: Response, message?: string) {
    const response: NotImplemented = {
      "code": 501,
      "message": message || "Not implemented yet"
    };

    res.status(501).send(response);
  }

  /**
   * Returns content type without parameters
   */
  protected getBareContentType(contentType?: string) {
    if (!contentType) {
      return null;
    }

    return contentType.split(";")[0].trim();
  }

  /**
   * Truncates time to seconds
   * 
   * @param time time
   * @returns time truncated to seconds
   */
  protected truncateTime(time: Date): Date  {
    return moment(time).milliseconds(0).toDate();
  }

}