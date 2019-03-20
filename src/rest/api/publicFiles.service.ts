import { Application, Response, Request } from "express";
import * as Keycloak from "keycloak-connect";
import AbstractService from "../abstract-service";

export default abstract class PublicFilesService extends AbstractService {

  /**
   * Constructor
   * 
   * @param app Express app
   * @param keycloak Keycloak
   */
  constructor(app: Application, keycloak: Keycloak) {
    super();

    app.post(`/rest/v1${this.toPath('/publicFiles')}`, [ keycloak.protect() ], this.catchAsync(this.createPublicFile.bind(this)));
    app.delete(`/rest/v1${this.toPath('/publicFiles/${encodeURIComponent(String(publicFileId))}')}`, [ keycloak.protect() ], this.catchAsync(this.deletePublicFile.bind(this)));
    app.get(`/rest/v1${this.toPath('/publicFiles/${encodeURIComponent(String(publicFileId))}')}`, [ keycloak.protect() ], this.catchAsync(this.findPublicFile.bind(this)));
    app.get(`/rest/v1${this.toPath('/publicFiles')}`, [ keycloak.protect() ], this.catchAsync(this.listPublicFiles.bind(this)));
    app.put(`/rest/v1${this.toPath('/publicFiles/${encodeURIComponent(String(publicFileId))}')}`, [ keycloak.protect() ], this.catchAsync(this.updatePublicFile.bind(this)));
  }


  /**
   * Creates public file
   * @summary Create public file
   * Accepted parameters:
    * - (body) PublicFile body - Payload
  */
  public abstract createPublicFile(req: Request, res: Response): Promise<void>;


  /**
   * Deletes public file
   * @summary Delete public file
   * Accepted parameters:
    * - (path) string publicFileId - publicFile id id
  */
  public abstract deletePublicFile(req: Request, res: Response): Promise<void>;


  /**
   * Finds public file by id
   * @summary Find public file
   * Accepted parameters:
    * - (path) string publicFileId - publicFile id id
  */
  public abstract findPublicFile(req: Request, res: Response): Promise<void>;


  /**
   * Lists public files
   * @summary Lists public files
   * Accepted parameters:
    * - (query) number firstResult - Offset of first result. Defaults to 0
    * - (query) number maxResults - Max results. Defaults to 5
  */
  public abstract listPublicFiles(req: Request, res: Response): Promise<void>;


  /**
   * Updates public file
   * @summary Update public file
   * Accepted parameters:
    * - (body) PublicFile body - Payload
    * - (path) string publicFileId - publicFile id id
  */
  public abstract updatePublicFile(req: Request, res: Response): Promise<void>;

}