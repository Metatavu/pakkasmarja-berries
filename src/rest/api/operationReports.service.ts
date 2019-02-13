import { Application, Response, Request } from "express";
import * as Keycloak from "keycloak-connect";
import AbstractService from "../abstract-service";

/* tslint:disable */
import { BadRequest } from '../model/badRequest';
import { Forbidden } from '../model/forbidden';
import { InternalServerError } from '../model/internalServerError';
import { OperationReport } from '../model/operationReport';
import { OperationReportItem } from '../model/operationReportItem';
/* tslint:enable */
export default abstract class OperationReportsService extends AbstractService {

  /**
   * Constructor
   * 
   * @param app Express app
   * @param keycloak Keycloak
   */
  constructor(app: Application, keycloak: Keycloak) {
    super();

    app.get(`/rest/v1${this.toPath('/operationReports/${encodeURIComponent(String(id))}')}`, [ keycloak.protect() ], this.catchAsync(this.findOperationReport.bind(this)));
    app.get(`/rest/v1${this.toPath('/operationReports/${encodeURIComponent(String(id))}/items')}`, [ keycloak.protect() ], this.catchAsync(this.listOperationReportItems.bind(this)));
    app.get(`/rest/v1${this.toPath('/operationReports')}`, [ keycloak.protect() ], this.catchAsync(this.listOperationReports.bind(this)));
  }


  /**
   * Find operation report by id
   * @summary Find operation report
   * Accepted parameters:
    * - (path) string id - operation report id
  */
  public abstract findOperationReport(req: Request, res: Response): Promise<void>;


  /**
   * Lists operation report items
   * @summary List operation report items
   * Accepted parameters:
    * - (path) string id - operation report id
  */
  public abstract listOperationReportItems(req: Request, res: Response): Promise<void>;


  /**
   * Lists operation reports
   * @summary List operation reports
   * Accepted parameters:
    * - (query) string type - filter by type
    * - (query) string sortBy - sort by (CREATED)
    * - (query) string sortDir - sort direction (ASC, DESC)
    * - (query) number firstResult - Offset of first result. Defaults to 0
    * - (query) number maxResults - Max results. Defaults to 20
  */
  public abstract listOperationReports(req: Request, res: Response): Promise<void>;

}