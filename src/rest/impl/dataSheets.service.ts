import { Application, Response, Request } from "express";
import * as Keycloak from "keycloak-connect";
import * as uuid from "uuid/v4";
import models, { DataSheetModel } from "../../models";
import DataSheetsService from "../api/dataSheets.service";
import { DataSheet } from "../model/models";
import ApplicationRoles from "../application-roles";

/**
 * Implementation for Public Files REST service
 */
export default class DataSheetsServiceImpl extends DataSheetsService {
  
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
  public async createDataSheet(req: Request, res: Response): Promise<void> {
    if (!this.hasRealmRole(req, ApplicationRoles.MANAGE_DATA_SHEETS)) {
      this.sendForbidden(res, "You  do not have permission to manage data sheets");
      return;
    }

    const data: string | null[][] = req.body.data;
    const name: string = req.body.name;

    const createdDataSheet = await models.createDataSheet(uuid(), name, JSON.stringify(data));
    res.status(200).send(this.translateDataSheet(createdDataSheet));
  }
  
    /**
   * @inheritdoc
   */
  public async deleteDataSheet(req: Request, res: Response): Promise<void> {
    if (!this.hasRealmRole(req, ApplicationRoles.MANAGE_DATA_SHEETS)) {
      this.sendForbidden(res, "You  do not have permission to manage data sheets");
      return;
    }

    const dataSheetId = req.params.dataSheetId;
    await models.deleteDataSheet(dataSheetId);
    res.status(204).send();
  }

  /**
   * @inheritdoc
   */
  public async findDataSheet(req: Request, res: Response): Promise<void> {
    if (!this.hasRealmRole(req, ApplicationRoles.MANAGE_DATA_SHEETS)) {
      this.sendForbidden(res, "You  do not have permission to manage data sheets");
      return;
    }

    const dataSheetId = req.params.dataSheetId;
    const dataSheet = await models.findDataSheetById(dataSheetId);
    if (!dataSheet) {
      res.status(404).send();
      return;
    }

    res.status(200).send(this.translateDataSheet(dataSheet));
  }

  /**
   * @inheritdoc
   */
  public async listDataSheets(req: Request, res: Response): Promise<void> {
    if (!this.hasRealmRole(req, ApplicationRoles.MANAGE_DATA_SHEETS)) {
      this.sendForbidden(res, "You  do not have permission to manage data sheets");
      return;
    }

    const name = req.query.name;
    const dataSheets = await models.listDataSheetsByName(name);
    res.status(200).send(dataSheets.map((dataSheet) => this.translateDataSheet(dataSheet)));
  }

  /**
   * @inheritdoc
   */
  public async updateDataSheet(req: Request, res: Response): Promise<void> {
    if (!this.hasRealmRole(req, ApplicationRoles.MANAGE_DATA_SHEETS)) {
      this.sendForbidden(res, "You  do not have permission to manage data sheets");
      return;
    }
    
    const dataSheetId = req.params.dataSheetId;
    const data: string | null[][] = req.body.data;
    const name: string = req.body.name;

    await models.updateDataSheet(dataSheetId, name, JSON.stringify(data));

    const dataSheet = await models.findDataSheetById(dataSheetId);
    if (!dataSheet) {
      res.status(404).send();
      return;
    }
    res.status(200).send(this.translateDataSheet(dataSheet));
  }

  /**
   * Translates data sheet for the rest endpoint
   * 
   * @param databaseDataSheet Stored data sheet entity
   */
  private translateDataSheet(databaseDataSheet: DataSheetModel): DataSheet {
    return {
      id: databaseDataSheet.id,
      data: JSON.parse(databaseDataSheet.data),
      name: databaseDataSheet.name
    };
  }

}