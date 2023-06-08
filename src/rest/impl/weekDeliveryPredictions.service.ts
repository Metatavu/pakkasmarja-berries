import { Application, Response, Request } from "express";
import * as Keycloak from "keycloak-connect";
import models, { WeekDeliveryPredictionModel } from "../../models";
import WeekDeliveryPredictionsService from "../api/weekDeliveryPredictions.service";
import { WeekDeliveryPrediction } from "../model/models";
import { WeekDeliveryPredictionDays } from '../model/weekDeliveryPredictionDays';
import ApplicationRoles from "../application-roles";
import * as uuid from "uuid/v4";

/**
 * Implementation for WeekDeliveryPredictions REST service
 */
export default class WeekDeliveryPredictionsServiceImpl extends WeekDeliveryPredictionsService {

  /**
   * Constructor
   *
   * @param app Express app
   * @param keycloak Keycloak
   */
  constructor(app: Application, keycloak: Keycloak) {
    super(app, keycloak);
  }

  /**
   * @inheritdoc
   */
  public async createWeekDeliveryPrediction(req: Request, res: Response) {
    const itemGroupId = req.body.itemGroupId;
    if (!itemGroupId) {
      this.sendBadRequest(res, "Missing required param item group id");
      return;
    }

    const databaseItemGroup = await models.findItemGroupByExternalId(itemGroupId);
    if (!databaseItemGroup) {
      this.sendNotFound(res);
      return;
    }

    const loggedUserId = this.getLoggedUserId(req);
    if (!loggedUserId) {
      this.sendForbidden(res, "You have no permission to create week delivery prediction");
      return;
    }

    const amount = req.body.amount;
    if (!amount) {
      this.sendBadRequest(res, "Missing required param amount");
    }

    const weekNumber = req.body.weekNumber;
    if (!weekNumber) {
      this.sendBadRequest(res, "Missing required param week number");
    }

    const year = req.body.year;
    if (!year) {
      this.sendBadRequest(res, "Missing required param year");
    }

    const days = req.body.days;
    if (!days) {
      this.sendBadRequest(res, "Missing required param days");
    }

    const daysBitValue = this.getDaysBitValue(days);

    const result = await models.createWeekDeliveryPrediction(uuid(), databaseItemGroup.id, loggedUserId, amount, weekNumber, year, daysBitValue);
    res.status(200).send(await this.translateDatabaseWeekDeliveryPredictions(result));
  }


  /**
   * @inheritdoc
   */
  public async deleteWeekDeliveryPrediction(req: Request, res: Response) {
    const weekDeliveryPredictionId = req.params.weekDeliveryPredictionId;
    const databaseWeekDeliveryPredication = await models.findWeekDeliveryPredictionById(weekDeliveryPredictionId);

    if (!databaseWeekDeliveryPredication) {
      this.sendNotFound(res);
      return;
    }

    const loggedUserId = this.getLoggedUserId(req);

    if (loggedUserId !== databaseWeekDeliveryPredication.userId && !this.hasRealmRole(req, ApplicationRoles.DELETE_WEEK_DELIVERY_PREDICTIONS)) {
      this.sendForbidden(res, "You have no permission to delete this week delivery prediction");
      return;
    }

    await models.deleteWeekDeliveryPredictionById(weekDeliveryPredictionId);
    res.status(204).send();
  }


  /**
   * @inheritdoc
   */
  public async findWeekDeliveryPrediction(req: Request, res: Response) {
    const weekDeliveryPredictionId = req.params.weekDeliveryPredictionId;
    const databaseWeekDeliveryPredication = await models.findWeekDeliveryPredictionById(weekDeliveryPredictionId);

    if (!databaseWeekDeliveryPredication) {
      this.sendNotFound(res);
      return;
    }

    const loggedUserId = this.getLoggedUserId(req);

    if (loggedUserId !== databaseWeekDeliveryPredication.userId && !this.hasRealmRole(req, ApplicationRoles.LIST_ALL_WEEK_DELIVERY_PREDICTION)) {
      this.sendForbidden(res, "You have no permission to find this week delivery prediction");
      return;
    }

    res.status(200).send(await this.translateDatabaseWeekDeliveryPredictions(databaseWeekDeliveryPredication));
  }


  /**
   * @inheritdoc
   */
  public async listWeekDeliveryPredictions(req: Request, res: Response) {
    const itemGroupId = req.query.itemGroupId || null;
    const itemGroupType = req.query.itemGroupType || null;
    const userId = req.query.userId || null;
    const weekNumber = req.query.weekNumber || null;
    const year = req.query.year || null;
    const firstResult = parseInt(req.query.firstResult as any) || 0;
    const maxResults = parseInt(req.query.maxResults as any) || 5;

    const databaseItemGroup = await models.findItemGroupByExternalId(itemGroupId as any);

    if (itemGroupId && !databaseItemGroup) {
      this.sendNotFound(res);
      return;
    }

    if (!userId && !this.hasRealmRole(req, ApplicationRoles.LIST_ALL_WEEK_DELIVERY_PREDICTION)) {
      this.sendForbidden(res, "You have no permission to list this contracts prices");
      return;
    }

    const databaseItemGroupId = databaseItemGroup ? databaseItemGroup.id : null;

    const weekDeliveryPredictions: WeekDeliveryPredictionModel[] = await models.listWeekDeliveryPredictions(
      databaseItemGroupId,
      itemGroupType as any,
      userId as any,
      weekNumber as any,
      year as any,
      firstResult,
      maxResults
    );
    res.status(200).send(await Promise.all(weekDeliveryPredictions.map((weekDeliveryPrediction) => {
      return this.translateDatabaseWeekDeliveryPredictions(weekDeliveryPrediction);
    })));
  }


  /**
   * @inheritdoc
   */
  public async updateWeekDeliveryPrediction(req: Request, res: Response) {
    const userId = req.body.userId;
    if (!userId) {
      this.sendNotFound(res);
      return;
    }

    const loggedUserId = this.getLoggedUserId(req);
    if (loggedUserId !== userId && !this.hasRealmRole(req, ApplicationRoles.UPDATE_OTHER_WEEK_DELIVERY_PREDICTION)) {
      this.sendForbidden(res, "You have no permission to update this contact");
      return;
    }

    const amount = req.body.amount;
    if (!amount) {
      this.sendBadRequest(res, "Missing required param amount");
      return;
    }

    const weekNumber = req.body.weekNumber;
    if (!weekNumber) {
      this.sendBadRequest(res, "Missing required param week number");
      return;
    }

    const year = req.body.year;
    if (!year) {
      this.sendBadRequest(res, "Missing required param year");
      return;
    }

    const days = req.body.days;
    if (!days) {
      this.sendBadRequest(res, "Missing required param days");
      return;
    }

    const itemGroupId = req.body.itemGroupId;
    if (!itemGroupId) {
      this.sendBadRequest(res, "Missing required param item group id");
      return;
    }

    const databaseItemGroup = await models.findItemGroupByExternalId(itemGroupId);
    if (!databaseItemGroup) {
      this.sendNotFound(res);
      return;
    }

    const weekDeliveryPredictionId = req.params.weekDeliveryPredictionId;
    const databaseWeekDeliveryPredication = await models.findWeekDeliveryPredictionById(weekDeliveryPredictionId);

    if (!databaseWeekDeliveryPredication || !databaseWeekDeliveryPredication.id) {
      this.sendNotFound(res);
      return;
    }

    const daysBitValue = this.getDaysBitValue(days);

    await models.updateWeekDeliveryPrediction(databaseWeekDeliveryPredication.id, databaseItemGroup.id, amount, weekNumber, year, daysBitValue);
    const updatedWeekDeliveryPredication = await models.findWeekDeliveryPredictionById(databaseWeekDeliveryPredication.id);

    res.status(200).send(await this.translateDatabaseWeekDeliveryPredictions(updatedWeekDeliveryPredication));
  }

  /**
   * Get bit value of days object
   *
   * @param days days object
   * @return bit value number
   */
  private getDaysBitValue(days: WeekDeliveryPredictionDays): number {
    const dayBitmasks = this.getDayBitmasks();

    const byteNumber = Object.keys(dayBitmasks).reduce((previousValue, day) => {
      if (days[day]) {
        return previousValue | dayBitmasks[day];
      }

      return previousValue;
    }, 0);

    return byteNumber;
  }

  /**
   * Get days object
   *
   * @param days days
   * @return days
   */
  private getDaysObject(days: number) {
    const dayBitmasks = this.getDayBitmasks();

    const daysObject: WeekDeliveryPredictionDays = {
      monday: !!(days & dayBitmasks.monday),
      tuesday: !!(days & dayBitmasks.tuesday),
      wednesday: !!(days & dayBitmasks.wednesday),
      thursday: !!(days & dayBitmasks.thursday),
      friday: !!(days & dayBitmasks.friday),
      saturday: !!(days & dayBitmasks.saturday),
      sunday: !!(days & dayBitmasks.sunday),
    }

    return daysObject;
  }

  /**
   * Returns bitmasks for days
   *
   * @return Object of days and bit masks
   */
  private getDayBitmasks() {
    return {
      monday: 1 << 0,
      tuesday: 1 << 1,
      wednesday: 1 << 2,
      thursday: 1 << 3,
      friday: 1 << 4,
      saturday: 1 << 5,
      sunday: 1 << 6
    };
  }

  /**
   * Translates Database week delivery predictions place into REST entity
   *
   * @param {Object} weekDeliveryPrediction Sequelize week delivery prediction model
   * @return {WeekDeliveryPredictionModel} REST entity
   */
  private async translateDatabaseWeekDeliveryPredictions(weekDeliveryPrediction: WeekDeliveryPredictionModel) {
    const itemGroup = await models.findItemGroupById(weekDeliveryPrediction.itemGroupId);

    const result: WeekDeliveryPrediction = {
      "id": weekDeliveryPrediction.id,
      "itemGroupId": itemGroup.externalId,
      "userId": weekDeliveryPrediction.userId,
      "amount": weekDeliveryPrediction.amount,
      "weekNumber": weekDeliveryPrediction.weekNumber,
      "year": weekDeliveryPrediction.year,
      "days": this.getDaysObject(weekDeliveryPrediction.days)
    };

    return result;
  }
}