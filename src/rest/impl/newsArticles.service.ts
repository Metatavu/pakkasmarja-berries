import { Response, Request } from "express";
import NewsArticlesService from "../api/newsArticles.service";
import ApplicationRoles from "../application-roles";
import { NewsArticle } from "../model/models";
import models, { NewsArticleModel } from "../../models";
import mqtt from "../../mqtt";
import moment = require("moment");

/**
 * Implementation for NewsArticles REST service
 */
export default class NewsArticlesServiceImpl extends NewsArticlesService {

  /**
   * @inheritdoc
   */
  public async createNewsArticle(req: Request, res: Response): Promise<void> {
    if (!this.hasRealmRole(req, ApplicationRoles.MANAGE_NEWS_ARTICLES)) {
      this.sendForbidden(res, "You  do not have permission to manage news articles");
      return;
    }

    const body: NewsArticle  = req.body;
    const databaseNewsArticle = await models.createNewsArticle(body.title, body.contents, body.imageUrl);
    res.status(200).send(await this.translateDatabaseNewsArticle(databaseNewsArticle));

    mqtt.publish("newsarticles", {
      "operation": "CREATED",
      "id": databaseNewsArticle.id
    });
  }

  /**
   * @inheritdoc
   */
  public async deleteNewsArticle(req: Request, res: Response): Promise<void> {
    if (!this.hasRealmRole(req, ApplicationRoles.MANAGE_NEWS_ARTICLES)) {
      this.sendForbidden(res, "You  do not have permission to manage news articles");
      return;
    }

    const newsArticleId: number = req.params.newsArticleId;
    if (!newsArticleId) {
      this.sendNotFound(res);
      return;
    }

    const databaseNewsArticle = await models.findNewsArticleById(newsArticleId);
    if (!databaseNewsArticle) {
      this.sendNotFound(res);
      return;
    }

    await models.deleteNewsArticle(databaseNewsArticle.id);

    mqtt.publish("newsarticles", {
      "operation": "DELETED",
      "id": newsArticleId
    });

    res.status(204).send();
  }

  /**
   * @inheritdoc
   */
  public async findNewsArticle(req: Request, res: Response): Promise<void> {
    const newsArticleId = req.params.newsArticleId;
    if (!newsArticleId) {
      this.sendNotFound(res);
      return;
    }
    
    const databaseNewsArticle = await models.findNewsArticleById(newsArticleId);
    if (!databaseNewsArticle) {
      this.sendNotFound(res);
      return;
    }
    
    res.status(200).send(await this.translateDatabaseNewsArticle(databaseNewsArticle));
  }
  /**
   * @inheritdoc
   */
  public async listNewsArticles(req: Request, res: Response): Promise<void> {
    const newsArticles = await models.listNewsArticles();
    res.status(200).send(newsArticles.map((newsArticle) => this.translateDatabaseNewsArticle(newsArticle)));
  }

  /**
   * @inheritdoc
   */
  public async updateNewsArticle(req: Request, res: Response): Promise<void> {
    if (!this.hasRealmRole(req, ApplicationRoles.MANAGE_NEWS_ARTICLES)) {
      this.sendForbidden(res, "You  do not have permission to manage news articles");
      return;
    }

    const newsArticleId = req.params.newsArticleId;
    if (!newsArticleId) {
      this.sendNotFound(res);
      return;
    }
    
    const databaseNewsArticle = await models.findNewsArticleById(newsArticleId);
    if (!databaseNewsArticle) {
      this.sendNotFound(res);
      return;
    }

    const body: NewsArticle = req.body;

    models.updateNewsArticle(databaseNewsArticle.id, body.title, body.contents, body.imageUrl, true);
    
    mqtt.publish("newsarticles", {
      "operation": "UPDATED",
      "id": newsArticleId
    });

    res.status(200).send(await this.translateDatabaseNewsArticle(databaseNewsArticle));
  }

  /**
   * Translates NewArticle from database model into REST model
   * 
   * @param newsArticleModel database model
   * @returns REST model
   */
  private translateDatabaseNewsArticle(newsArticleModel: NewsArticleModel): NewsArticle | null {
    if (!newsArticleModel) {
      return null;
    }

    return {
      contents: newsArticleModel.contents,
      createdAt: this.truncateTime(newsArticleModel.createdAt),
      id: newsArticleModel.id,
      imageUrl: newsArticleModel.imageUrl,
      title: newsArticleModel.title,
      updatedAt: this.truncateTime(newsArticleModel.updatedAt)
    };
  }

  /**
   * Truncates time to seconds
   * 
   * @param time time
   * @returns time truncated to seconds
   */
  private truncateTime(time: Date): Date  {
    return moment(time).milliseconds(0).toDate();
  }

}