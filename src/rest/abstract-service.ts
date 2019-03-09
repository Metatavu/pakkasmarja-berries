import { Response, Request } from "express";
import { BadRequest } from './model/badRequest';
import { NotFound } from './model/notFound';
import { Forbidden } from './model/forbidden';
import { InternalServerError } from './model/internalServerError';
import { NotImplemented } from "./model/models";
import { getLogger, Logger } from "log4js";
import userManagement from "../user-management";
import { ApplicationScope } from "./application-scopes";
import ResourceRepresentation from "keycloak-admin/lib/defs/resourceRepresentation";
import PolicyRepresentation from "keycloak-admin/lib/defs/policyRepresentation";
import { ChatGroupModel } from "src/models";
import moment = require("moment");

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
    await this.createScopePermission(permissionName, resource, scopes, policy);
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
    return userManagement.createScopePermission(name, [ resource.id || (resource as any)._id ], scopes, [ policy.id! ]);
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
  getAccessToken(req: Request) {
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
  getLoggedUserId(req: Request) {
    const accessToken = this.getAccessToken(req);
    return accessToken && accessToken.content ? accessToken.content.sub : null;
  }

  /**
   * Returns whether user has specified realm role or not 
   * 
   * @param {object} req express request
   * @param {String} role realm role 
   */
  hasRealmRole(req: Request, role: string) {
    const accessToken = this.getAccessToken(req);
    return accessToken.hasRealmRole(role);
  }

  /**
   * Catch unhandled promise errors
   * 
   * @param {function} handler handler function
   * @return {Function} decorated handler function
   */
  catchAsync(handler: (req: Request, res: Response) => void) {
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
  toPath(path: string) {
    return path.replace(/\$\{encodeURIComponent\(String\((.*?)\)\)\}/g, (match, param) => { 
      return `:${param}`;
    });
  }

  /**
   * Responds with 404 - not found
   * 
   * @param {http.ServerResponse} res server response object
   */
  sendNotFound(res: Response, message?: string) {
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
  sendBadRequest(res: Response, message?: string) {
    const response: BadRequest = {
      "code": 400,
      "message": message || "Bad Request"
    };

    res.status(400).send(response);
  }

  /**
   * Responds with 403 - forbidden
   * 
   * @param {http.ServerResponse} res server response object
   * @param {String} message (optional)
   */
  sendForbidden(res: Response, message?: string) {
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
  sendInternalServerError(res: Response, error? : string|Error) {
    const message = error instanceof Error ? (error as Error).message : error;
    const response: InternalServerError = {
      "code": 500,
      "message": message || "Bad Request"
    };

    res.status(500).send(response);
  }

  /**
   * Responds with 501 - not implemented
   * 
   * @param {http.ServerResponse} res server response object
   * @param {String} message (optional)
   */
  sendNotImplemented(res: Response, message?: string) {
    const response: NotImplemented = {
      "code": 501,
      "message": message || "Not implemented yet"
    };

    res.status(501).send(response);
  }

  /**
   * Returns content type without parameters
   */
  getBareContentType(contentType?: string) {
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