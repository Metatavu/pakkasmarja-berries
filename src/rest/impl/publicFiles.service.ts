import { Application, Response, Request } from "express";
import * as Keycloak from "keycloak-connect";
import PublicFilesService from "../api/publicFiles.service";

/**
 * Implementation for Products REST service
 */
export default class PublicFilesServiceImpl extends PublicFilesService {
  
  /**
   * Constructor
   * 
   * @param app Express app
   * @param keycloak Keycloak
   */
  constructor(app: Application, keycloak: Keycloak) {
    super(app, keycloak);
  }

  public createPublicFile(req: Request, res: Response): Promise<void> {
    throw new Error("Method not implemented.");
  }
  public deletePublicFile(req: Request, res: Response): Promise<void> {
    throw new Error("Method not implemented.");
  }
  public findPublicFile(req: Request, res: Response): Promise<void> {
    throw new Error("Method not implemented.");
  }
  public listPublicFiles(req: Request, res: Response): Promise<void> {
    throw new Error("Method not implemented.");
  }
  public updatePublicFile(req: Request, res: Response): Promise<void> {
    throw new Error("Method not implemented.");
  }

}