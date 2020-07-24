import { Application, Response, Request } from "express";
import * as Keycloak from "keycloak-connect";
import OpeningHoursService from "../api/openingHours.service";
import models, { OpeningHourDayModel, OpeningHourPeriodModel, OpeningHourDayIntervalModel, OpeningHourExceptionModel, OpeningHourExceptionIntervalModel } from "../../models";
import ApplicationRoles from "../application-roles";
import { OpeningHourPeriod, OpeningHourWeekday, WeekdayType, OpeningHourInterval, OpeningHourException } from "../model/models";
import Bluebird = require("bluebird");

/**
 * Interface describing a database item with an external id
 */
export interface IdentifiedDatabaseItem {
  externalId: string;
}

/**
 * Interface describing a REST item with an id
 */
export interface IdentifiedRESTItem {
  id: string | null;
}

/**
 * Implementation for Products REST service
 */
export default class OpeningHoursServiceImpl extends OpeningHoursService {
  
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
  async listOpeningHourPeriods(req: Request, res: Response) {
    const deliveryPlaceExternalId: string = req.params.deliveryPlaceId;
    const rangeStart: Date = req.query.rangeStart;
    const rangeEnd: Date = req.query.rangeEnd;
    const firstResult: number = parseInt(req.query.firstResult) || 0;
    const maxResults: number | undefined = parseInt(req.query.maxResults) || undefined;

    if (!deliveryPlaceExternalId) {
      this.sendBadRequest(res, "Missing required parameter deliveryPlaceId from request");
      return;
    }

    const deliveryPlace = await models.findDeliveryPlaceByExternalId(deliveryPlaceExternalId);
    if (!deliveryPlace) {
      this.sendNotFound(res, "Delivery place with given id was not found");
      return;
    }

    const periodModels = await models.listOpeningHourPeriods(deliveryPlace.id, rangeStart, rangeEnd, firstResult, maxResults);
    const periods = await Promise.all(
      periodModels.map(periodModel => this.createPeriodRestStructure(periodModel))
    );

    res.status(200).send(periods);
  }

  /**
   * @inheritdoc
   */
  async createOpeningHourPeriod(req: Request, res: Response) {
    const deliveryPlaceId: string = req.params.deliveryPlaceId;

    if (!this.hasRealmRole(req, ApplicationRoles.MANAGE_OPENING_HOURS) ||
        !this.hasRealmRole(req, ApplicationRoles.ADMINISTRATE_OPENING_HOURS)) {
      this.sendForbidden(res, "You  do not have permission to manage opening hours for this delivery place");
      return;
    }

    if (!deliveryPlaceId) {
      this.sendBadRequest(res, "Missing required parameter deliveryPlaceId from request");
      return;
    }

    const deliveryPlace = await models.findDeliveryPlaceByExternalId(deliveryPlaceId);

    if (!deliveryPlace) {
      this.sendNotFound(res, "Delivery place not found");
      return;
    }

    const beginDate: Date = req.body.beginDate;
    const endDate: Date = req.body.endDate;
    const weekdays: OpeningHourWeekday[] = req.body.weekdays;

    if (!beginDate) {
      this.sendBadRequest(res, "Missing required property from period: beginDate");
      return;
    }

    if (!endDate) {
      this.sendBadRequest(res, "Missing required property form period: endDate");
      return;
    }

    if (!weekdays) {
      this.sendBadRequest(res, "Missing required property from period: weekdays");
      return;
    }

    if (weekdays.length !== 7) {
      this.sendBadRequest(res, "Period property weekdays does not contain 7 items. Weekdays must and can only contain only one item for each weekday");
      return;
    }

    const createdPeriodModel: OpeningHourPeriodModel = await models.createOpeningHourPeriod(deliveryPlace.id, beginDate, endDate);
    const createdWeekdayModels: OpeningHourDayModel[] = await Promise.all(
      weekdays.map(day => models.createOpeningHourDay(createdPeriodModel.id, day.dayType!))
    );

    const createdPeriod = this.translateDatabaseOpeningHourPeriod(createdPeriodModel);
    createdPeriod.weekdays = createdWeekdayModels.map(day => this.translateDatabaseOpeningHourDay(day));

    res.status(200).send(createdPeriod);
  }


  /**
   * @inheritdoc
   */
  async findOpeningHourPeriod(req: Request, res: Response) {
    const deliveryPlaceExternalId: string = req.params.deliveryPlaceId;
    const periodExternalId: string = req.params.periodId;

    if (!this.hasRealmRole(req, ApplicationRoles.MANAGE_OPENING_HOURS) ||
        !this.hasRealmRole(req, ApplicationRoles.ADMINISTRATE_OPENING_HOURS)) {
      this.sendForbidden(res, "You  do not have permission to manage opening hours for this delivery place");
      return;
    }

    if (!deliveryPlaceExternalId) {
      this.sendBadRequest(res, "Missing required parameter from request: deliveryPlaceId");
      return;
    }

    if (!periodExternalId) {
      this.sendBadRequest(res, "Missing required parameter from request: periodId");
      return;
    }

    const deliveryPlace = await models.findDeliveryPlaceByExternalId(deliveryPlaceExternalId);
    if (!deliveryPlace) {
      this.sendNotFound(res, "Delivery place with given id was not found");
      return;
    }

    const foundPeriodModel = await models.findOpeningHourPeriod(periodExternalId);
    if (!foundPeriodModel) {
      this.sendNotFound(res, "Period not found");
      return;
    }

    const foundPeriod = await this.createPeriodRestStructure(foundPeriodModel);

    res.status(200).send(foundPeriod);
  }

  /**
   * @inheritdoc
   */
  async updateOpeningHourPeriod(req: Request, res: Response) {
    const deliveryPlaceExternalId: string = req.params.deliveryPlaceId;
    const periodExternalId: string = req.params.periodId;
    const period: OpeningHourPeriod = req.body;

    if (!this.hasRealmRole(req, ApplicationRoles.MANAGE_OPENING_HOURS) ||
        !this.hasRealmRole(req, ApplicationRoles.ADMINISTRATE_OPENING_HOURS)) {
      this.sendForbidden(res, "You  do not have permission to manage opening hours for this delivery place");
      return;
    }

    if (!deliveryPlaceExternalId) {
      this.sendBadRequest(res, "Missing required parameter from request: deliveryPlaceId");
      return;
    }

    if (!periodExternalId) {
      this.sendBadRequest(res, "Missing required parameter from request: periodId");
      return;
    }

    if (!period) {
      this.sendBadRequest(res, "Missing period object from request body");
      return;
    }

    const beginDate: Date = period.beginDate;
    const endDate: Date = period.endDate;
    const weekdays: OpeningHourWeekday[] = period.weekdays;
    if (!beginDate) {
      this.sendBadRequest(res, "Missing property from period: beginDate");
      return;
    }

    if (!endDate) {
      this.sendBadRequest(res, "Missing property from period: endDate");
      return;
    }

    if (!weekdays) {
      this.sendBadRequest(res, "Missing property from period: weekdays");
      return;
    }

    if (weekdays.length !== 7) {
      this.sendBadRequest(res, "Period property weekdays does not contain 7 items. Weekdays must and can only contain only one item for each weekday");
      return;
    }

    const deliveryPlace = await models.findDeliveryPlaceByExternalId(deliveryPlaceExternalId);
    if (!deliveryPlace) {
      this.sendNotFound(res, "Delivery place not found");
      return;
    }

    const periodModel = await models.findOpeningHourPeriod(periodExternalId);
    if (!periodModel) {
      this.sendNotFound(res, "Period not found");
      return;
    }

    await models.updateOpeningHourPeriod(periodModel.id, period.beginDate, period.endDate);
    const weekdayModels = await models.listOpeningHourDays(periodModel.id);
    const updatedModel = await models.findOpeningHourPeriod(periodModel.externalId);

    await Promise.all(
      weekdayModels.map(async dayModel => {
        const periodWeekday = period.weekdays.find(day => day.id === dayModel.externalId);
        if (!periodWeekday) {
          return;
        }

        const existingIntervals = await models.listOpeningHourDayIntervals(dayModel.id);

        const createInterval = (interval: OpeningHourInterval) =>
          models.createOpeningHourDayInterval(dayModel.id, interval.opens, interval.closes);

        const findInterval = (interval: OpeningHourInterval) =>
          models.findOpeningHourDayInterval(interval.id!);

        const updateInterval = (interval: OpeningHourInterval) =>
          models.updateOpeningHourDayInterval(interval.id!, interval.opens, interval.closes);

        const deleteInterval = (intervalModel: OpeningHourDayIntervalModel) =>
          models.deleteOpeningHourDayInterval(intervalModel.id);

        await this.syncListItems(
          periodWeekday.hours,
          existingIntervals,
          createInterval,
          findInterval,
          updateInterval,
          deleteInterval
        );
      })
    );

    const updatedPeriod = await this.createPeriodRestStructure(updatedModel);

    res.status(200).send(updatedPeriod);
  }

  /**
   * @inheritdoc
   */
  async deleteOpeningHourPeriod(req: Request, res: Response) {
    const deliveryPlaceExternalId: string = req.params.deliveryPlaceId;
    const periodExternalId: string = req.params.periodId;

    if (!this.hasRealmRole(req, ApplicationRoles.MANAGE_OPENING_HOURS) ||
        !this.hasRealmRole(req, ApplicationRoles.ADMINISTRATE_OPENING_HOURS)) {
      this.sendForbidden(res, "You  do not have permission to manage opening hours for this delivery place");
      return;
    }

    if (!deliveryPlaceExternalId) {
      this.sendBadRequest(res, "Missing required parameter from request: deliveryPlaceId");
      return;
    }
    
    if (!periodExternalId) {
      this.sendBadRequest(res, "Missing required parameter from request: periodId");
      return;
    }

    const deliveryPlace = await models.findDeliveryPlaceByExternalId(deliveryPlaceExternalId);
    if (!deliveryPlace) {
      this.sendNotFound(res, "Delivery place not found");
      return;
    }
    
    const periodModel = await models.findOpeningHourPeriod(periodExternalId);
    if (!periodModel) {
      this.sendNotFound(res, "Period not found");
      return;
    }

    const weekdayModels = await models.listOpeningHourDays(periodModel.id);
    await Promise.all(
      weekdayModels.map(day => {
        return models.deleteOpeningHourDayIntervals(day.id)
      })
    );
    
    await models.deleteOpeningHourDays(periodModel.id);
    await models.deleteOpeningHourPeriod(periodModel.id);

    res.status(204).send();
  }

  /**
   * @inheritdoc
   */
  async listOpeningHourExceptions(req: Request, res: Response) {
    const deliveryPlaceExternalId: string = req.params.deliveryPlaceId;
    if (!deliveryPlaceExternalId) {
      this.sendBadRequest(res, "Missing required parameter from request: deliveryPlaceId");
      return;
    }

    const deliveryPlace = await models.findDeliveryPlaceByExternalId(deliveryPlaceExternalId);
    if (!deliveryPlace) {
      this.sendNotFound(res, "Delivery place not found");
      return;
    }

    const openingHourExceptionModels = await models.listOpeningHourExceptions(deliveryPlace.id);
    const openingHourExceptions = await Promise.all(
      openingHourExceptionModels.map(exception =>
        this.createExceptionRestStructure(exception)
      )
    );

    res.status(200).send(openingHourExceptions);
  }

  /**
   * @inheritdoc
   */
  async createOpeningHourException(req: Request, res: Response) {
    const deliveryPlaceExternalId: string = req.params.deliveryPlaceId;

    if (!this.hasRealmRole(req, ApplicationRoles.MANAGE_OPENING_HOURS) ||
        !this.hasRealmRole(req, ApplicationRoles.ADMINISTRATE_OPENING_HOURS)) {
      this.sendForbidden(res, "You  do not have permission to manage opening hours for this delivery place");
      return;
    }

    if (!deliveryPlaceExternalId) {
      this.sendBadRequest(res, "Missing required parameter from request: deliveryPlaceId");
      return;
    }

    const deliveryPlace = await models.findDeliveryPlaceByExternalId(deliveryPlaceExternalId);
    if (!deliveryPlace) {
      this.sendNotFound(res, "Delivery place not found");
      return;
    }

    const exceptionDate: Date = req.body.exceptionDate;
    const hours: OpeningHourInterval[] = req.body.hours;
    if (!exceptionDate) {
      this.sendBadRequest(res, "Missing required parameter from request body: exceptionDate");
      return;
    }

    if (!hours) {
      this.sendBadRequest(res, "Missing required parameter from request body: hours");
      return;
    }

    const createdExceptionModel = await models.createOpeningHourException(deliveryPlace.id, exceptionDate);
    await Promise.all(
      hours.map(interval =>
        models.createOpeningHourExceptionInterval(
          createdExceptionModel.id,
          interval.opens,
          interval.closes
        )
      )
    );

    const createdException = await this.createExceptionRestStructure(createdExceptionModel);

    res.status(200).send(createdException);
  }

  /**
   * @inheritdoc
   */
  async updateOpeningHourException(req: Request, res: Response) {
    const exceptionExternalId: string = req.params.exceptionId;
    const deliveryPlaceExternalId: string = req.params.deliveryPlaceId;

    if (!this.hasRealmRole(req, ApplicationRoles.MANAGE_OPENING_HOURS) ||
        !this.hasRealmRole(req, ApplicationRoles.ADMINISTRATE_OPENING_HOURS)) {
      this.sendForbidden(res, "You  do not have permission to manage opening hours for this delivery place");
      return;
    }

    if (!exceptionExternalId) {
      this.sendBadRequest(res, "Missing required parameter from request: exceptionId");
      return;
    }

    if (!deliveryPlaceExternalId) {
      this.sendBadRequest(res, "Missing required parameter from request: deliveryPlaceId");
      return;
    }

    const deliveryPlace = await models.findDeliveryPlaceByExternalId(deliveryPlaceExternalId);
    if (!deliveryPlace) {
      this.sendNotFound(res, "Delivery place not found");
      return;
    }

    const exceptionDate: Date = req.body.exceptionDate;
    const hours: OpeningHourInterval[] = req.body.hours;

    if (!exceptionDate) {
      this.sendBadRequest(res, "Missing required parameter from request body: exceptionDate");
      return;
    }

    if (!hours) {
      this.sendBadRequest(res, "Missing required parameter from request body: hours");
      return;
    }

    const exceptionModel = await models.findOpeningHourException(exceptionExternalId);
    if (!exceptionModel) {
      this.sendNotFound(res, "Exception not found");
      return;
    }

    await models.updateOpeningHourException(exceptionExternalId, exceptionDate);
    const existingModels = await models.listOpeningHourExceptionIntervals(exceptionModel.id);
    
    const createInterval = (interval: OpeningHourInterval) =>
      models.createOpeningHourExceptionInterval(exceptionModel.id, interval.opens, interval.closes);

    const findInterval = (interval: OpeningHourInterval) =>
      models.findOpeningHourExceptionInterval(interval.id!);

    const updateInterval = (interval: OpeningHourInterval) =>
      models.updateOpeningHourExceptionInterval(interval.id!, interval.opens, interval.closes);

    const deleteInterval = (intervalModel: OpeningHourExceptionIntervalModel) =>
      models.deleteOpeningHourExceptionInterval(intervalModel.id);

    await this.syncListItems(
      hours,
      existingModels,
      createInterval,
      findInterval,
      updateInterval,
      deleteInterval
    );

    const updatedException = await this.createExceptionRestStructure(exceptionModel);

    res.status(200).send(updatedException);
  }

  /**
   * @inheritdoc
   */
  async deleteOpeningHourException(req: Request, res: Response) {
    const deliveryPlaceExternalId: string = req.params.deliveryPlaceId;
    const exceptionExternalId: string = req.params.exceptionId;

    if (!this.hasRealmRole(req, ApplicationRoles.MANAGE_OPENING_HOURS) ||
        !this.hasRealmRole(req, ApplicationRoles.ADMINISTRATE_OPENING_HOURS)) {
      this.sendForbidden(res, "You  do not have permission to manage opening hours for this delivery place");
      return;
    }

    if (!deliveryPlaceExternalId) {
      this.sendBadRequest(res, "Missing required parameter from request: deliveryPlaceId");
      return;
    }
    
    if (!exceptionExternalId) {
      this.sendBadRequest(res, "Missing required parameter from request: exceptionId");
      return;
    }

    const deliveryPlace = await models.findDeliveryPlaceByExternalId(deliveryPlaceExternalId);
    if (!deliveryPlace) {
      this.sendNotFound(res, "Delivery place not found");
      return;
    }
    
    const exceptionModel = await models.findOpeningHourException(exceptionExternalId);
    if (!exceptionModel) {
      this.sendNotFound(res, "Period not found");
      return;
    }

    const weekdayModels = await models.listOpeningHourExceptionIntervals(exceptionModel.id);
    await Promise.all(
      weekdayModels.map(day => {
        return models.deleteOpeningHourDayIntervals(day.id)
      })
    );
    
    await models.deleteOpeningHourExceptionIntervals(exceptionModel.id);
    await models.deleteOpeningHourException(exceptionModel.id);

    res.status(204).send();
  }


  /**
   * Creates REST structure for opening hour period
   * 
   * @param periodModel opening hour period model
   */
  private createPeriodRestStructure = async (periodModel: OpeningHourPeriodModel): Promise<OpeningHourPeriod> => {
    const period = this.translateDatabaseOpeningHourPeriod(periodModel);
    const periodWeekdayModels = await models.listOpeningHourDays(periodModel.id);

    period.weekdays = await Promise.all(
      periodWeekdayModels.map(async weekdayModel => {
        const weekday = this.translateDatabaseOpeningHourDay(weekdayModel);
        const weekdayIntervalModels = await models.listOpeningHourDayIntervals(weekdayModel.id);

        weekday.hours = weekdayIntervalModels.map(intervalModel => {
          return this.translateDatabaseOpeningHourInterval(intervalModel);
        });

        return weekday;
      })
    );

    return period;
  }

  /**
   * Creates REST structure for opening hour exception
   * 
   * @param exceptionModel opening hour exception model
   */
  private createExceptionRestStructure = async (exceptionModel: OpeningHourExceptionModel): Promise<OpeningHourException> => {
    const exception = this.translateDatabaseOpeningHourException(exceptionModel);
    const exceptionIntervalModels = await models.listOpeningHourExceptionIntervals(exceptionModel.id);
    exception.hours = await Promise.all(
      exceptionIntervalModels.map(intervalModel => {
        return this.translateDatabaseOpeningHourInterval(intervalModel);
      })
    );

    return exception;
  }

  /**
   * Translates database opening hour period into REST entity
   * 
   * @param databaseOpeningHourPeriod sequelize opening hour period model
   * @param databaseOpeningHourDays list of sequelize opening hour day models
   * @return period as REST entity
   */
  private translateDatabaseOpeningHourPeriod = (databaseOpeningHourPeriod: OpeningHourPeriodModel): OpeningHourPeriod => {
    const openingHourPeriod: OpeningHourPeriod = {
      id: databaseOpeningHourPeriod.externalId,
      beginDate: databaseOpeningHourPeriod.beginDate,
      endDate: databaseOpeningHourPeriod.endDate,
      weekdays: []
    };

    return openingHourPeriod;
  }

  /**
   * Translates database opening hour exception into REST entity
   * 
   * @param databaseOpeningHourException sequelize opening hour exception model
   * @returns exception as REST entity
   */
  private translateDatabaseOpeningHourException = (databaseOpeningHourException: OpeningHourExceptionModel): OpeningHourException => {
    const exception: OpeningHourException = {
      id: databaseOpeningHourException.externalId,
      exceptionDate: databaseOpeningHourException.exceptionDate,
      hours: []
    }

    return exception;
  }

  /**
   * Translates database opening hour day into REST entity
   * 
   * @param databaseOpeningHourDay sequelize opening hour day model
   * @param databaseOpeningHourDayIntervals sequelize opening hour day interval models
   * @return weekday as REST entity
   */
  private translateDatabaseOpeningHourDay = (databaseOpeningHourDay: OpeningHourDayModel): OpeningHourWeekday => {
    const openingHourDay: OpeningHourWeekday = {
      id: databaseOpeningHourDay.externalId,
      dayType: databaseOpeningHourDay.dayType as WeekdayType,
      hours: []
    };

    return openingHourDay;
  }

  /**
   * Translates database opening hour interval into REST entity
   * 
   * @param databaseOpeningHourInterval sequelize opening hour interval model
   * @return interval as REST entity
   */
  private translateDatabaseOpeningHourInterval = (databaseOpeningHourInterval: OpeningHourDayIntervalModel | OpeningHourExceptionIntervalModel): OpeningHourInterval => {
    const interval: OpeningHourInterval = {
      id: databaseOpeningHourInterval.externalId,
      opens: databaseOpeningHourInterval.opens,
      closes: databaseOpeningHourInterval.closes
    }

    return interval;
  }

  /**
   * Syncs database state to match given items list state
   * 
   * @param D item in database
   * @param I item from REST
   * @param items list of REST items
   * @param existingItems list of current items in database
   * @param createItem method for creating new items
   * @param findItem method for finding existing items
   * @param updateItem method for updating existing items
   * @param deleteItem method for deleting deprecated items
   * @returns promise for new list of database items
   */
  private syncListItems = async <D extends IdentifiedDatabaseItem, I extends IdentifiedRESTItem>(
    items: I[],
    existingItems: D[],
    createItem: (item: I) => Bluebird<D>,
    findItem: (item: I) => Bluebird<D>,
    updateItem: (item: I) => Bluebird<[number, any]>,
    deleteItem: (item: D) => Bluebird<number>
  ): Promise<D[]> => {
    const newList = await Promise.all(items.map(async (item) => {
      let existingIndex = existingItems.findIndex(findItem => findItem.externalId === item.id);
      if (existingIndex == -1) {
        return await createItem(item);
      } else {
        existingItems.splice(existingIndex, 1);
        await updateItem(item);
        return await findItem(item);
      }
    }));

    await Promise.all(existingItems.map(deleteItem));

    return newList;
  }
}