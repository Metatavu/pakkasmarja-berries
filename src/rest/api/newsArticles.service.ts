import { Application, Response, Request } from "express";
import * as Keycloak from "keycloak-connect";
import AbstractService from "../abstract-service";

export default abstract class NewsArticlesService extends AbstractService {

  /**
   * Constructor
   * 
   * @param app Express app
   * @param keycloak Keycloak
   */
  constructor(app: Application, keycloak: Keycloak) {
    super();

    app.post(`/rest/v1${this.toPath('/newsArticles')}`, [ keycloak.protect() ], this.catchAsync(this.createNewsArticle.bind(this)));
    app.delete(`/rest/v1${this.toPath('/newsArticles/${encodeURIComponent(String(newsArticleId))}')}`, [ keycloak.protect() ], this.catchAsync(this.deleteNewsArticle.bind(this)));
    app.get(`/rest/v1${this.toPath('/newsArticles/${encodeURIComponent(String(newsArticleId))}')}`, [ keycloak.protect() ], this.catchAsync(this.findNewsArticle.bind(this)));
    app.get(`/rest/v1${this.toPath('/newsArticles')}`, [ keycloak.protect() ], this.catchAsync(this.listNewsArticles.bind(this)));
    app.put(`/rest/v1${this.toPath('/newsArticles/${encodeURIComponent(String(newsArticleId))}')}`, [ keycloak.protect() ], this.catchAsync(this.updateNewsArticle.bind(this)));
  }


  /**
   * Creates news article
   * @summary Create news article
   * Accepted parameters:
    * - (body) NewsArticle body - Payload
  */
  public abstract createNewsArticle(req: Request, res: Response): Promise<void>;


  /**
   * Deletes news article
   * @summary Delete news article
   * Accepted parameters:
    * - (path) number newsArticleId - news article id id
  */
  public abstract deleteNewsArticle(req: Request, res: Response): Promise<void>;


  /**
   * Finds news article by id
   * @summary Find news article
   * Accepted parameters:
    * - (path) number newsArticleId - news article id id
  */
  public abstract findNewsArticle(req: Request, res: Response): Promise<void>;


  /**
   * Lists news articles
   * @summary Lists news articles
   * Accepted parameters:
  */
  public abstract listNewsArticles(req: Request, res: Response): Promise<void>;


  /**
   * Updates news article
   * @summary Update news article
   * Accepted parameters:
    * - (body) NewsArticle body - Payload
    * - (path) number newsArticleId - news article id id
  */
  public abstract updateNewsArticle(req: Request, res: Response): Promise<void>;

}