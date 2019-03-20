import { Application, Response, Request } from "express";
import * as Keycloak from "keycloak-connect";
import AbstractService from "../abstract-service";

export default abstract class DeliveriesService extends AbstractService {

  /**
   * Constructor
   * 
   * @param app Express app
   * @param keycloak Keycloak
   */
  constructor(app: Application, keycloak: Keycloak) {
    super();

    app.post(`/rest/v1${this.toPath('/deliveries')}`, [ keycloak.protect() ], this.catchAsync(this.createDelivery.bind(this)));
    app.post(`/rest/v1${this.toPath('/deliveries/${encodeURIComponent(String(deliveryId))}/notes')}`, [ keycloak.protect() ], this.catchAsync(this.createDeliveryNote.bind(this)));
    app.delete(`/rest/v1${this.toPath('/deliveries/${encodeURIComponent(String(deliveryId))}')}`, [ keycloak.protect() ], this.catchAsync(this.deleteDelivery.bind(this)));
    app.delete(`/rest/v1${this.toPath('/deliveries/${encodeURIComponent(String(deliveryId))}/notes/${encodeURIComponent(String(deliveryNoteId))}')}`, [ keycloak.protect() ], this.catchAsync(this.deleteDeliveryNote.bind(this)));
    app.get(`/rest/v1${this.toPath('/deliveries/${encodeURIComponent(String(deliveryId))}')}`, [ keycloak.protect() ], this.catchAsync(this.findDelivery.bind(this)));
    app.get(`/rest/v1${this.toPath('/deliveries/${encodeURIComponent(String(deliveryId))}/notes/${encodeURIComponent(String(deliveryNoteId))}')}`, [ keycloak.protect() ], this.catchAsync(this.findDeliveryNote.bind(this)));
    app.get(`/rest/v1${this.toPath('/deliveries')}`, [ keycloak.protect() ], this.catchAsync(this.listDeliveries.bind(this)));
    app.get(`/rest/v1${this.toPath('/deliveries/${encodeURIComponent(String(deliveryId))}/notes')}`, [ keycloak.protect() ], this.catchAsync(this.listDeliveryNotes.bind(this)));
    app.put(`/rest/v1${this.toPath('/deliveries/${encodeURIComponent(String(deliveryId))}')}`, [ keycloak.protect() ], this.catchAsync(this.updateDelivery.bind(this)));
    app.put(`/rest/v1${this.toPath('/deliveries/${encodeURIComponent(String(deliveryId))}/notes/${encodeURIComponent(String(deliveryNoteId))}')}`, [ keycloak.protect() ], this.catchAsync(this.updateDeliveryNote.bind(this)));
  }


  /**
   * Creates delivery
   * @summary Create delivery
   * Accepted parameters:
    * - (body) Delivery body - Payload
  */
  public abstract createDelivery(req: Request, res: Response): Promise<void>;


  /**
   * Creates delivery note
   * @summary Create delivery note
   * Accepted parameters:
    * - (body) DeliveryNote body - Payload
    * - (path) string deliveryId - delivery id id
  */
  public abstract createDeliveryNote(req: Request, res: Response): Promise<void>;


  /**
   * Deletes delivery
   * @summary Delete delivery
   * Accepted parameters:
    * - (path) string deliveryId - delivery id id
  */
  public abstract deleteDelivery(req: Request, res: Response): Promise<void>;


  /**
   * Deletes delivery note
   * @summary Delete delivery note
   * Accepted parameters:
    * - (path) string deliveryId - delivery id id
    * - (path) string deliveryNoteId - delivery id id
  */
  public abstract deleteDeliveryNote(req: Request, res: Response): Promise<void>;


  /**
   * Finds delivery by id
   * @summary Find delivery
   * Accepted parameters:
    * - (path) string deliveryId - delivery id id
  */
  public abstract findDelivery(req: Request, res: Response): Promise<void>;


  /**
   * Finds delivery note by id
   * @summary Find delivery note
   * Accepted parameters:
    * - (path) string deliveryId - delivery id id
    * - (path) string deliveryNoteId - delivery id id
  */
  public abstract findDeliveryNote(req: Request, res: Response): Promise<void>;


  /**
   * Lists deliveries
   * @summary Lists deliveries
   * Accepted parameters:
    * - (query) DeliveryStatus status - filter by status
    * - (query) ItemGroupType itemGroupType - filter by item group id
    * - (query) string itemGroupId - filter by item group id
    * - (query) string productId - filter by item group id
    * - (query) string deliveryPlaceId - filter by delivery place id
    * - (query) string timeBefore - filter by time before specified time
    * - (query) string timeAfter - filter by time after specified time
    * - (query) number firstResult - Offset of first result. Defaults to 0
    * - (query) number maxResults - Max results. Defaults to 5
  */
  public abstract listDeliveries(req: Request, res: Response): Promise<void>;


  /**
   * Lists deliveries notes
   * @summary Lists deliveries notes
   * Accepted parameters:
    * - (path) string deliveryId - delivery id id
  */
  public abstract listDeliveryNotes(req: Request, res: Response): Promise<void>;


  /**
   * Updates delivery
   * @summary Update delivery
   * Accepted parameters:
    * - (body) Delivery body - Payload
    * - (path) string deliveryId - delivery id id
  */
  public abstract updateDelivery(req: Request, res: Response): Promise<void>;


  /**
   * Updates delivery note
   * @summary Update delivery note
   * Accepted parameters:
    * - (body) DeliveryNote body - Payload
    * - (path) string deliveryId - delivery id id
    * - (path) string deliveryNoteId - delivery id id
  */
  public abstract updateDeliveryNote(req: Request, res: Response): Promise<void>;

}