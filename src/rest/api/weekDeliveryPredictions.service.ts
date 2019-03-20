import { Application, Response, Request } from "express";
import * as Keycloak from "keycloak-connect";
import AbstractService from "../abstract-service";

export default abstract class WeekDeliveryPredictionsService extends AbstractService {

  /**
   * Constructor
   * 
   * @param app Express app
   * @param keycloak Keycloak
   */
  constructor(app: Application, keycloak: Keycloak) {
    super();

    app.post(`/rest/v1${this.toPath('/weekDeliveryPredictions')}`, [ keycloak.protect() ], this.catchAsync(this.createWeekDeliveryPrediction.bind(this)));
    app.delete(`/rest/v1${this.toPath('/weekDeliveryPredictions/${encodeURIComponent(String(weekDeliveryPredictionId))}')}`, [ keycloak.protect() ], this.catchAsync(this.deleteWeekDeliveryPrediction.bind(this)));
    app.get(`/rest/v1${this.toPath('/weekDeliveryPredictions/${encodeURIComponent(String(weekDeliveryPredictionId))}')}`, [ keycloak.protect() ], this.catchAsync(this.findWeekDeliveryPrediction.bind(this)));
    app.get(`/rest/v1${this.toPath('/weekDeliveryPredictions')}`, [ keycloak.protect() ], this.catchAsync(this.listWeekDeliveryPredictions.bind(this)));
    app.put(`/rest/v1${this.toPath('/weekDeliveryPredictions/${encodeURIComponent(String(weekDeliveryPredictionId))}')}`, [ keycloak.protect() ], this.catchAsync(this.updateWeekDeliveryPrediction.bind(this)));
  }


  /**
   * Creates week delivery prediction
   * @summary Create week delivery prediction
   * Accepted parameters:
    * - (body) WeekDeliveryPrediction body - Payload
  */
  public abstract createWeekDeliveryPrediction(req: Request, res: Response): Promise<void>;


  /**
   * Deletes weekDeliveryPrediction
   * @summary Delete weekDeliveryPrediction
   * Accepted parameters:
    * - (path) string weekDeliveryPredictionId - weekDeliveryPrediction id id
  */
  public abstract deleteWeekDeliveryPrediction(req: Request, res: Response): Promise<void>;


  /**
   * Finds weekDeliveryPrediction by id
   * @summary Find weekDeliveryPrediction
   * Accepted parameters:
    * - (path) string weekDeliveryPredictionId - weekDeliveryPrediction id id
  */
  public abstract findWeekDeliveryPrediction(req: Request, res: Response): Promise<void>;


  /**
   * Lists weekDeliveryPredictions
   * @summary Lists weekDeliveryPredictions
   * Accepted parameters:
    * - (query) string itemGroupId - filter by item group id
    * - (query) ItemGroupType itemGroupType - filter by item group id
    * - (query) string userId - filter by user id
    * - (query) number weekNumber - filter by week number
    * - (query) number year - filter by year
    * - (query) number firstResult - Offset of first result. Defaults to 0
    * - (query) number maxResults - Max results. Defaults to 5
  */
  public abstract listWeekDeliveryPredictions(req: Request, res: Response): Promise<void>;


  /**
   * Updates weekDeliveryPrediction
   * @summary Update weekDeliveryPrediction
   * Accepted parameters:
    * - (body) WeekDeliveryPrediction body - Payload
    * - (path) string weekDeliveryPredictionId - weekDeliveryPrediction id id
  */
  public abstract updateWeekDeliveryPrediction(req: Request, res: Response): Promise<void>;

}