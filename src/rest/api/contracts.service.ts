import { Application, Response, Request } from "express";
import * as Keycloak from "keycloak-connect";
import AbstractService from "../abstract-service";

export default abstract class ContractsService extends AbstractService {

  /**
   * Constructor
   * 
   * @param app Express app
   * @param keycloak Keycloak
   */
  constructor(app: Application, keycloak: Keycloak) {
    super();

    app.post(`/rest/v1${this.toPath('/contracts')}`, [ keycloak.protect() ], this.catchAsync(this.createContract.bind(this)));
    app.post(`/rest/v1${this.toPath('/contracts/${encodeURIComponent(String(id))}/documents/${encodeURIComponent(String(type))}/signRequests')}`, [ keycloak.protect() ], this.catchAsync(this.createContractDocumentSignRequest.bind(this)));
    app.post(`/rest/v1${this.toPath('/contracts/${encodeURIComponent(String(contractId))}/documentTemplates')}`, [ keycloak.protect() ], this.catchAsync(this.createContractDocumentTemplate.bind(this)));
    app.get(`/rest/v1${this.toPath('/contracts/${encodeURIComponent(String(id))}')}`, [ keycloak.protect() ], this.catchAsync(this.findContract.bind(this)));
    app.get(`/rest/v1${this.toPath('/contracts/${encodeURIComponent(String(contractId))}/documentTemplates/${encodeURIComponent(String(contractDocumentTemplateId))}')}`, [ keycloak.protect() ], this.catchAsync(this.findContractDocumentTemplate.bind(this)));
    app.get(`/rest/v1${this.toPath('/contracts/${encodeURIComponent(String(id))}/documents/${encodeURIComponent(String(type))}')}`, [ keycloak.protect() ], this.catchAsync(this.getContractDocument.bind(this)));
    app.get(`/rest/v1${this.toPath('/contracts/${encodeURIComponent(String(contractId))}/documentTemplates')}`, [ keycloak.protect() ], this.catchAsync(this.listContractDocumentTemplates.bind(this)));
    app.get(`/rest/v1${this.toPath('/contracts/${encodeURIComponent(String(contractId))}/prices')}`, [ keycloak.protect() ], this.catchAsync(this.listContractPrices.bind(this)));
    app.get(`/rest/v1${this.toPath('/contracts')}`, [ keycloak.protect() ], this.catchAsync(this.listContracts.bind(this)));
    app.put(`/rest/v1${this.toPath('/contracts/${encodeURIComponent(String(id))}')}`, [ keycloak.protect() ], this.catchAsync(this.updateContract.bind(this)));
    app.put(`/rest/v1${this.toPath('/contracts/${encodeURIComponent(String(contractId))}/documentTemplates/${encodeURIComponent(String(contractDocumentTemplateId))}')}`, [ keycloak.protect() ], this.catchAsync(this.updateContractDocumentTemplate.bind(this)));
  }


  /**
   * Create new contract
   * @summary Create contract
   * Accepted parameters:
    * - (body) Contract body - Payload
  */
  public abstract createContract(req: Request, res: Response): Promise<void>;


  /**
   * Requests contract document electronic signing
   * @summary Requests contract document electronic signing
   * Accepted parameters:
    * - (body) ContractDocumentSignRequest body - Payload
    * - (path) string id - contract id
    * - (path) string type - document type
    * - (query) string ssn - Social security number
    * - (query) string authService - Used auth service name
    * - (query) string redirectUrl - Redirect after succesfull signing
  */
  public abstract createContractDocumentSignRequest(req: Request, res: Response): Promise<void>;


  /**
   * Create new contract document template
   * @summary Create contract document template
   * Accepted parameters:
    * - (body) ContractDocumentTemplate body - Payload
    * - (path) string contractId - contract id
  */
  public abstract createContractDocumentTemplate(req: Request, res: Response): Promise<void>;


  /**
   * Finds contract by id
   * @summary Find contract
   * Accepted parameters:
    * - (path) string id - contract id
    * - (header) string accept - Expected response format. Accepted values application/json for JSON reponse (default) and application/vnd.openxmlformats-officedocument.spreadsheetml.sheet for Excel response
  */
  public abstract findContract(req: Request, res: Response): Promise<void>;


  /**
   * Finds a contract templates
   * @summary Find contract document template
   * Accepted parameters:
    * - (path) string contractId - contract id
    * - (path) string contractDocumentTemplateId - contract id
  */
  public abstract findContractDocumentTemplate(req: Request, res: Response): Promise<void>;


  /**
   * Returns contract document by type
   * @summary Returns contract document
   * Accepted parameters:
    * - (path) string id - contract id
    * - (path) string type - document type
    * - (query) string format - document format (HTML or PDF)
  */
  public abstract getContractDocument(req: Request, res: Response): Promise<void>;


  /**
   * Lists contract templates
   * @summary List contract document templates
   * Accepted parameters:
    * - (path) string contractId - contract id
    * - (query) string type - Filter results by document template type
  */
  public abstract listContractDocumentTemplates(req: Request, res: Response): Promise<void>;


  /**
   * Lists contract prices
   * @summary List contract prices
   * Accepted parameters:
    * - (path) string contractId - contract id
    * - (query) string sortBy - sort by (YEAR)
    * - (query) string sortDir - sort direction (ASC, DESC)
    * - (query) number firstResult - Offset of first result. Defaults to 0
    * - (query) number maxResults - Max results. Defaults to 5
  */
  public abstract listContractPrices(req: Request, res: Response): Promise<void>;


  /**
   * Lists contracts
   * @summary Lists contracts
   * Accepted parameters:
    * - (header) string accept - Expected response format. Accepted values application/json for JSON reponse (default) and application/vnd.openxmlformats-officedocument.spreadsheetml.sheet for Excel response
    * - (query) boolean listAll - Returns all contracts instead of just user&#39;s own contracts. User must have permission to do this.
    * - (query) string itemGroupCategory - Filters results by item group category.
    * - (query) string itemGroupId - Filters results by item group id.
    * - (query) number year - Filters results by year.
    * - (query) string status - Filters results by status
    * - (query) number firstResult - Offset of first result. Defaults to 0
    * - (query) number maxResults - Max results. Defaults to 5
  */
  public abstract listContracts(req: Request, res: Response): Promise<void>;


  /**
   * Updates single contract
   * @summary Update contract
   * Accepted parameters:
    * - (body) Contract body - Payload
    * - (path) string id - contract id
  */
  public abstract updateContract(req: Request, res: Response): Promise<void>;


  /**
   * Updates a contract templates
   * @summary Updates contract document template
   * Accepted parameters:
    * - (body) ContractDocumentTemplate body - Payload
    * - (path) string contractId - contract id
    * - (path) string contractDocumentTemplateId - contract id
  */
  public abstract updateContractDocumentTemplate(req: Request, res: Response): Promise<void>;

}