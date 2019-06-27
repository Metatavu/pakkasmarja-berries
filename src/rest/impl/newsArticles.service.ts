import { Response, Request } from "express";
import NewsArticlesService from "../api/newsArticles.service";
import ApplicationRoles from "../application-roles";
import { NewsArticle } from "../model/models";
import models, { NewsArticleModel } from "../../models";
import mqtt from "../../mqtt";
import userManagement from "../../user-management";
import * as uuid from "uuid4";
import pushNotifications from "../../push-notifications";

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

    await this.sendNotifications(databaseNewsArticle);
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
      "id": databaseNewsArticle.id
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
    const imageUrl = body.imageUrl || null;
    models.updateNewsArticle(databaseNewsArticle.id, body.title, body.contents, imageUrl, true);
    
    mqtt.publish("newsarticles", {
      "operation": "UPDATED",
      "id": newsArticleId
    });

    res.status(200).send(await this.translateDatabaseNewsArticle(databaseNewsArticle));
  }

  /**
   * Sends notifications about created news to users
   * 
   * @param newsArticle newsArticle
   */
  private async sendNotifications(newsArticle: NewsArticle) {
    const path = `news-${newsArticle.id}`;
    const users = await userManagement.listAllUsers();
    const title = newsArticle.title;
    const unreadPromises = [];
    const pushPromises = [];

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      unreadPromises.push(models.createUnread(uuid(), path, user.id!));
      pushPromises.push(this.sendPushNotification(user.id!, 'Uusi ajankohtainen julkaistu.', title));
    }

    await Promise.all(unreadPromises);
    await Promise.all(pushPromises);
  }

  /**
   * Sends push notification to given user
   * 
   * @param userId user id
   * @param title title
   * @param body body
   * @param promise
   */
  private sendPushNotification = async (userId: string, title: string, body: string) => {
    const userSetting = await models.findUserSettingsByUserIdAndKey(userId, 'news-push-notification');
    if (!userSetting) {
      pushNotifications.sendPushNotification(userId, title, body, true);
    } else {
      if (userSetting.settingValue !== 'disabled') {
        pushNotifications.sendPushNotification(userId, title, body, userSetting.settingValue !== 'silent');
      }
    }
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

}