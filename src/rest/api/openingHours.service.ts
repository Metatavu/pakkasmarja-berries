import { Application, Response, Request } from "express";
import * as Keycloak from "keycloak-connect";
import AbstractService from "../abstract-service";

export default abstract class OpeningHoursService extends AbstractService {

  /**
   * Constructor
   * 
   * @param app Express app
   * @param keycloak Keycloak
   */
  constructor(app: Application, keycloak: Keycloak) {
    super();

    app.post(`/rest/v1${this.toPath('/openingHours/${encodeURIComponent(String(deliveryPlaceId))}/exceptions')}`, [ keycloak.protect() ], this.catchAsync(this.createOpeningHourException.bind(this)));
    app.post(`/rest/v1${this.toPath('/openingHours/${encodeURIComponent(String(deliveryPlaceId))}/periods')}`, [ keycloak.protect() ], this.catchAsync(this.createOpeningHourPeriod.bind(this)));
    app.delete(`/rest/v1${this.toPath('/openingHours/${encodeURIComponent(String(deliveryPlaceId))}/exceptions/${encodeURIComponent(String(exceptionId))}')}`, [ keycloak.protect() ], this.catchAsync(this.deleteOpeningHourException.bind(this)));
    app.delete(`/rest/v1${this.toPath('/openingHours/${encodeURIComponent(String(deliveryPlaceId))}/periods/${encodeURIComponent(String(periodId))}')}`, [ keycloak.protect() ], this.catchAsync(this.deleteOpeningHourPeriod.bind(this)));
    app.get(`/rest/v1${this.toPath('/openingHours/${encodeURIComponent(String(deliveryPlaceId))}/periods/${encodeURIComponent(String(periodId))}')}`, [ keycloak.protect() ], this.catchAsync(this.findOpeningHourPeriod.bind(this)));
    app.get(`/rest/v1${this.toPath('/openingHours/${encodeURIComponent(String(deliveryPlaceId))}/exceptions')}`, [ keycloak.protect() ], this.catchAsync(this.listOpeningHourExceptions.bind(this)));
    app.get(`/rest/v1${this.toPath('/openingHours/${encodeURIComponent(String(deliveryPlaceId))}/periods')}`, [ keycloak.protect() ], this.catchAsync(this.listOpeningHourPeriods.bind(this)));
    app.put(`/rest/v1${this.toPath('/openingHours/${encodeURIComponent(String(deliveryPlaceId))}/exceptions/${encodeURIComponent(String(exceptionId))}')}`, [ keycloak.protect() ], this.catchAsync(this.updateOpeningHourException.bind(this)));
    app.put(`/rest/v1${this.toPath('/openingHours/${encodeURIComponent(String(deliveryPlaceId))}/periods/${encodeURIComponent(String(periodId))}')}`, [ keycloak.protect() ], this.catchAsync(this.updateOpeningHourPeriod.bind(this)));
  }


  /**
   * Creates opening hour exception
   * @summary Create opening hour exception
   * Accepted parameters:
    * - (body) OpeningHourException body - Payload
    * - (path) string deliveryPlaceId - delivery place id
  */
  public abstract createOpeningHourException(req: Request, res: Response): Promise<void>;


  /**
   * Creates opening hour period
   * @summary Create opening hour period
   * Accepted parameters:
    * - (body) OpeningHourPeriod body - Payload
    * - (path) string deliveryPlaceId - delivery place id
  */
  public abstract createOpeningHourPeriod(req: Request, res: Response): Promise<void>;


  /**
   * Deletes opening hour exception
   * @summary Delete opening hour exception
   * Accepted parameters:
    * - (path) string deliveryPlaceId - delivery place id
    * - (path) string exceptionId - exception id
  */
  public abstract deleteOpeningHourException(req: Request, res: Response): Promise<void>;


  /**
   * Deletes opening hour period
   * @summary Delete opening hour period
   * Accepted parameters:
    * - (path) string deliveryPlaceId - delivery place id
    * - (path) string periodId - period id
  */
  public abstract deleteOpeningHourPeriod(req: Request, res: Response): Promise<void>;


  /**
   * Finds opening hour period
   * @summary Find opening hour period
   * Accepted parameters:
    * - (path) string deliveryPlaceId - delivery place id
    * - (path) string periodId - period id
  */
  public abstract findOpeningHourPeriod(req: Request, res: Response): Promise<void>;


  /**
   * Lists opening hour exceptions
   * @summary List opening hour exceptions
   * Accepted parameters:
    * - (path) string deliveryPlaceId - delivery place id
  */
  public abstract listOpeningHourExceptions(req: Request, res: Response): Promise<void>;


  /**
   * Lists opening hour periods
   * @summary List opening hour periods
   * Accepted parameters:
    * - (path) string deliveryPlaceId - delivery place id
    * - (query) string rangeStart - list date range start
    * - (query) string rangeEnd - list date range end
    * - (query) number firstResult - Offset of first result. Defaults to 0
    * - (query) number maxResults - Max results. Defaults to unlimited
  */
  public abstract listOpeningHourPeriods(req: Request, res: Response): Promise<void>;


  /**
   * Updates opening hour exception
   * @summary Update opening hour exception
   * Accepted parameters:
    * - (body) OpeningHourException body - Payload
    * - (path) string deliveryPlaceId - delivery place id
    * - (path) string exceptionId - exception id
  */
  public abstract updateOpeningHourException(req: Request, res: Response): Promise<void>;


  /**
   * Updates opening hour period
   * @summary Update opening hour period
   * Accepted parameters:
    * - (body) OpeningHourPeriod body - Payload
    * - (path) string deliveryPlaceId - delivery place id
    * - (path) string periodId - period id
  */
  public abstract updateOpeningHourPeriod(req: Request, res: Response): Promise<void>;

}