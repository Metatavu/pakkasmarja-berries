import { Application, Response, Request } from "express";
import * as Keycloak from "keycloak-connect";
import * as uuid from "uuid/v4";
import models, { PublicFileModel } from "../../models";
import PublicFilesService from "../api/publicFiles.service";
import { PublicFile } from "../model/models";

/**
 * Implementation for Public Files REST service
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

  /**
   * @inheritdoc
   */
  public async createPublicFile(req: Request, res: Response): Promise<void> {
    const publicFileUrl = req.body.url;
    const createdPublicFile = await models.createPublicFile(uuid(), publicFileUrl);
    res.status(200).send(this.translatePublicFile(createdPublicFile));
  }
  
    /**
   * @inheritdoc
   */
  public async deletePublicFile(req: Request, res: Response): Promise<void> {
    const publicFileId = req.params.publicFileId;
    await models.deletePublicFile(publicFileId);
    res.status(204).send();
  }

  /**
   * @inheritdoc
   */
  public async findPublicFile(req: Request, res: Response): Promise<void> {
    const publicFileId = req.params.publicFileId;
    const publicFile = await models.findPublicFileById(publicFileId);
    if (!publicFile) {
      res.status(404).send();
      return;
    }

    res.status(200).send(this.translatePublicFile(publicFile));
  }

  /**
   * @inheritdoc
   */
  public async listPublicFiles(req: Request, res: Response): Promise<void> {
    const firstResult = parseInt(req.query.firstResult) || 0;
    const maxResults = parseInt(req.query.maxResults) || 20;
    const publicFiles = await models.listPublicFiles(firstResult, maxResults);
    res.status(200).send(publicFiles.map((publicFile) => this.translatePublicFile(publicFile)));
  }

  /**
   * @inheritdoc
   */
  public async updatePublicFile(req: Request, res: Response): Promise<void> {
    const publicFileId = req.params.publicFileId;
    const publicFileUrl = req.body.url;
    await models.updatePublicFile(publicFileId, publicFileUrl);

    const publicFile = await models.findPublicFileById(publicFileId);
    if (!publicFile) {
      res.status(404).send();
      return;
    }
    res.status(200).send(this.translatePublicFile(publicFile));
  }

  /**
   * Translates public file for the rest endpoint
   * 
   * @param databasePublicFile Stored public file entity
   */
  private translatePublicFile(databasePublicFile: PublicFileModel): PublicFile {
    return {
      id: databasePublicFile.id,
      url: databasePublicFile.url
    };
  }

}