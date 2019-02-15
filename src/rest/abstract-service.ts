import { Response, Request } from "express";
import { BadRequest } from './model/badRequest';
import { NotFound } from './model/notFound';
import { Forbidden } from './model/forbidden';
import { InternalServerError } from './model/internalServerError';
import { NotImplemented } from "./model/models";
import { getLogger, Logger } from "log4js";

/**
 * Abstract base class for all REST services
 */
export default class AbstractService {

  private baseLogger: Logger = getLogger();

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
    console.log("role 1", role);
    const accessToken = this.getAccessToken(req);
    console.log("role 2", accessToken);
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

}