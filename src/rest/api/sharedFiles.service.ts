import { Application, Response, Request } from "express";
import * as Keycloak from "keycloak-connect";
import AbstractService from "../abstract-service";
import multer = require("multer");

export default abstract class SharedFilesService extends AbstractService {

  private storage = multer.memoryStorage();
  private upload = multer({ storage: this.storage });

  /**
   * Constructor
   *
   * @param app Express app
   * @param keycloak Keycloak
   */
  constructor(app: Application, keycloak: Keycloak) {
    super();
    app.delete(`/rest/v1${this.toPath('/sharedFiles')}`, [ keycloak.protect() ], this.catchAsync(this.deleteSharedFile.bind(this)));
    app.get(`/rest/v1${this.toPath('/sharedFiles/download')}`, [ keycloak.protect() ], this.catchAsync(this.getSharedFile.bind(this)));
    app.get(`/rest/v1${this.toPath('/sharedFiles')}`, [ keycloak.protect() ], this.catchAsync(this.listSharedFiles.bind(this)));
    app.post(`/rest/v1${this.toPath('/sharedFiles')}`, [ keycloak.protect(), this.upload.single("file") ], this.catchAsync(this.uploadSharedFile.bind(this)));
  }


  /**
   * Deletes shared file from Amazon S3
   * @summary Delete shared file from S3
   * Accepted parameters:
    * - (query) string fileName - File name
    * - (query) string pathPrefix - File path prefix
  */
  public abstract deleteSharedFile(req: Request, res: Response): Promise<void>;


  /**
   * Fetches shared file from Amazon S3
   * @summary Get shared file from S3
   * Accepted parameters:
    * - (query) string fileName - File name
    * - (query) string pathPrefix - Path prefix
  */
  public abstract getSharedFile(req: Request, res: Response): Promise<void>;


  /**
   * Lists shared files from Amazon S3
   * @summary List shared files from S3
   * Accepted parameters:
    * - (query) string pathPrefix - Path prefix
  */
  public abstract listSharedFiles(req: Request, res: Response): Promise<void>;


  /**
   * Uploads shared file to Amazon S3
   * @summary Upload shared file to S3
   * Accepted parameters:
    * - (query) string fileName - File name
    * - (body) Object body -
    * - (query) string pathPrefix - File path prefix
  */
  public abstract uploadSharedFile(req: Request, res: Response): Promise<void>;

}