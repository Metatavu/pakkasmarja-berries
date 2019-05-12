import * as _ from "lodash";
import { Response, Request } from "express";
import { BadRequest } from './model/badRequest';
import { NotFound } from './model/notFound';
import { Forbidden } from './model/forbidden';
import { InternalServerError } from './model/internalServerError';
import { NotImplemented } from "./model/models";
import { getLogger, Logger } from "log4js";
import moment = require("moment");
import chatGroupPermissionController from "../user-management/chat-group-permission-controller";
import userManagement from "../user-management";
import { ThreadModel, ChatGroupModel } from "../models";
import { CHAT_GROUP_MANAGE, ApplicationScope, CHAT_THREAD_ACCESS, CHAT_GROUP_ACCESS, CHAT_GROUP_TRAVERSE } from "./application-scopes";
import chatThreadPermissionController from "../user-management/chat-thread-permission-controller";

/**
 * Abstract base class for all REST services
 */
export default class AbstractService {

  private baseLogger: Logger = getLogger();
  
  /**
   * Returns whether logged user has manage permission to given thread
   * 
   * @param req request
   * @param thread thread
   * @param chatGroup chat group
   */
  protected async isThreadManagePermission(req: Request, thread: ThreadModel, chatGroup: ChatGroupModel) {
    if (await this.hasResourcePermission(req, chatGroupPermissionController.getChatGroupResourceName(chatGroup), [CHAT_GROUP_MANAGE])) {
      return true;
    }

    return false;
  }

  /**
   * Returns whether logged user has access permission to given thread
   * 
   * @param req request
   * @param thread thread
   * @param chatGroup chat group
   */
  protected async isThreadAccessPermission(req: Request, thread: ThreadModel, chatGroup: ChatGroupModel) {
    if (await this.hasResourcePermission(req, chatThreadPermissionController.getChatGroupResourceName(chatGroup), [CHAT_GROUP_MANAGE, CHAT_GROUP_ACCESS])) {
      return true;
    }

    if (await this.hasResourcePermission(req, chatThreadPermissionController.getChatThreadResourceName(thread), [CHAT_THREAD_ACCESS])) {
      return true;
    }

    return false;
  }

  /**
   * Checks whether given access token has required scopes
   * 
   * @param req request
   * @param resourceName resource name 
   * @param scopes required scopes
   * @return Promise for whether user has permission to resource or not 
   */
  public async hasResourcePermission(req: Request, resourceName: string, scopes: ApplicationScope[]): Promise<boolean> {
    const accessToken = (req as any).kauth.grant.access_token;

    console.log("Checking permission", resourceName, scopes);
    
    for (let i = 0; i < scopes.length; i++) {
      const result: boolean = await userManagement.hasResourcePermission(resourceName, [scopes[i]], accessToken.token);

      console.log("Checking permission result", scopes[i], result);

      if (result) {
        return true;
      }
    }

    return false;
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