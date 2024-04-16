import { Application, Response, Request } from "express";
import { Keycloak } from "keycloak-connect";
import AbstractService from "../abstract-service";

export default abstract class ContactsService extends AbstractService {

  /**
   * Constructor
   * 
   * @param app Express app
   * @param keycloak Keycloak
   */
  constructor(app: Application, keycloak: Keycloak) {
    super();

    app.get(`/rest/v1${this.toPath('/contacts/${encodeURIComponent(String(id))}/basic')}`, [ keycloak.protect() ], this.catchAsync(this.findBasicContact.bind(this)));
    app.get(`/rest/v1${this.toPath('/contacts/${encodeURIComponent(String(id))}')}`, [ keycloak.protect() ], this.catchAsync(this.findContact.bind(this)));
    app.get(`/rest/v1${this.toPath('/contacts')}`, [ keycloak.protect() ], this.catchAsync(this.listContacts.bind(this)));
    app.put(`/rest/v1${this.toPath('/contacts/${encodeURIComponent(String(id))}')}`, [ keycloak.protect() ], this.catchAsync(this.updateContact.bind(this)));
    app.put(`/rest/v1${this.toPath('/contacts/${encodeURIComponent(String(id))}/credentials')}`, [ keycloak.protect() ], this.catchAsync(this.updateContactCredentials.bind(this)));
  }


  /**
   * Finds a basic vesion of contact by id
   * @summary Find basic contact
   * Accepted parameters:
    * - (path) string id - contact id
  */
  public abstract findBasicContact(req: Request, res: Response): Promise<void>;


  /**
   * Finds contact by id
   * @summary Find contact
   * Accepted parameters:
    * - (path) string id - contact id
  */
  public abstract findContact(req: Request, res: Response): Promise<void>;


  /**
   * Lists contacts
   * @summary Lists contacts
   * Accepted parameters:
    * - (query) string search - filter results by free text search
  */
  public abstract listContacts(req: Request, res: Response): Promise<void>;


  /**
   * Updates single contact
   * @summary Update contact
   * Accepted parameters:
    * - (body) Contact body - Payload
    * - (path) string id - contact id
  */
  public abstract updateContact(req: Request, res: Response): Promise<void>;


  /**
   * Updates single contact credentials
   * @summary Update contact credentials
   * Accepted parameters:
    * - (body) Credentials body - Payload
    * - (path) string id - contact id
  */
  public abstract updateContactCredentials(req: Request, res: Response): Promise<void>;

}