import { Application, Response, Request } from "express";
import { Keycloak } from "keycloak-connect";
import AbstractService from "../abstract-service";

export default abstract class ReportsService extends AbstractService {

  /**
   * Constructor
   * 
   * @param app Express app
   * @param keycloak Keycloak
   */
  constructor(app: Application, keycloak: Keycloak) {
    super();

    app.get(`/rest/v1${this.toPath('/reports/${encodeURIComponent(String(type))}')}`, [ keycloak.protect() ], this.catchAsync(this.getReport.bind(this)));
  }


  /**
   * Returns report by type
   * @summary Returns report
   * Accepted parameters:
    * - (path) string type - Report type
    * - (query) string format - document format (HTML or PDF)
    * - (query) string startDate - deliveries from
    * - (query) string endDate - deliveries to
    * - (query) Array<string> productIds - filter by product Ids
  */
  public abstract getReport(req: Request, res: Response): Promise<void>;

}