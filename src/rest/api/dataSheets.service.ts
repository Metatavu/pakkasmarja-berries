import { Application, Response, Request } from "express";
import { Keycloak } from "keycloak-connect";
import AbstractService from "../abstract-service";

export default abstract class DataSheetsService extends AbstractService {

  /**
   * Constructor
   * 
   * @param app Express app
   * @param keycloak Keycloak
   */
  constructor(app: Application, keycloak: Keycloak) {
    super();

    app.post(`/rest/v1${this.toPath('/dataSheets')}`, [ keycloak.protect() ], this.catchAsync(this.createDataSheet.bind(this)));
    app.delete(`/rest/v1${this.toPath('/dataSheets/${encodeURIComponent(String(dataSheetId))}')}`, [ keycloak.protect() ], this.catchAsync(this.deleteDataSheet.bind(this)));
    app.get(`/rest/v1${this.toPath('/dataSheets/${encodeURIComponent(String(dataSheetId))}')}`, [ keycloak.protect() ], this.catchAsync(this.findDataSheet.bind(this)));
    app.get(`/rest/v1${this.toPath('/dataSheets')}`, [ keycloak.protect() ], this.catchAsync(this.listDataSheets.bind(this)));
    app.put(`/rest/v1${this.toPath('/dataSheets/${encodeURIComponent(String(dataSheetId))}')}`, [ keycloak.protect() ], this.catchAsync(this.updateDataSheet.bind(this)));
  }


  /**
   * Creates data sheet
   * @summary Create data sheet
   * Accepted parameters:
    * - (body) DataSheet body - Payload
  */
  public abstract createDataSheet(req: Request, res: Response): Promise<void>;


  /**
   * Deletes data sheet
   * @summary Delete data sheet
   * Accepted parameters:
    * - (path) string dataSheetId - dataSheet id id
  */
  public abstract deleteDataSheet(req: Request, res: Response): Promise<void>;


  /**
   * Finds data sheet by id
   * @summary Find data sheet
   * Accepted parameters:
    * - (path) string dataSheetId - dataSheet id id
  */
  public abstract findDataSheet(req: Request, res: Response): Promise<void>;


  /**
   * Lists data sheets
   * @summary Lists data sheets
   * Accepted parameters:
    * - (query) string name - Filter by name
  */
  public abstract listDataSheets(req: Request, res: Response): Promise<void>;


  /**
   * Updates data sheet
   * @summary Update data sheet
   * Accepted parameters:
    * - (body) DataSheet body - Payload
    * - (path) string dataSheetId - dataSheet id id
  */
  public abstract updateDataSheet(req: Request, res: Response): Promise<void>;

}