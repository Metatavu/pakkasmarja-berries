import { Application, Response, Request } from "express";
import * as Keycloak from "keycloak-connect";
import models, { DeliveryModel, DeliveryNoteModel, DeliveryPlaceModel, ProductModel } from "../../models";
import DeliveriesService from "../api/deliveries.service";
import { Delivery, DeliveryLoan, DeliveryNote, ItemGroupCategory } from "../model/models";
import ApplicationRoles from "../application-roles";
import * as uuid from "uuid/v4";
import moment = require("moment");
import userManagement, { UserProperty } from "../../user-management";
import { config } from "../../config";
import UserRepresentation from "keycloak-admin/lib/defs/userRepresentation";
import * as _ from "lodash";
import mailer from "../../mailer";
import { getLogger } from "log4js";
import { createStackedReject, logReject } from "../../utils";
import ErpClient from "../../erp/client";
import { BinActionType, HttpError, SapBatchNumber, SapStockTransfer, SapStockTransferLine } from "../../generated/erp-services-client/api";

/**
 * Implementation for Deliveries REST service
 */
export default class DeliveriesServiceImpl extends DeliveriesService {

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
  public async createDelivery(req: Request, res: Response) {
    const productId = req.body.productId;
    if (!productId) {
      this.sendBadRequest(res, "Missing required body param productId");
      return;
    }

    const userId = req.body.userId;
    if (!userId) {
      this.sendBadRequest(res, "Missing required body param userId");
      return;
    }

    const time = req.body.time;
    if (!time) {
      this.sendBadRequest(res, "Missing required body param time");
      return;
    }

    const status = req.body.status;
    if (!status) {
      this.sendBadRequest(res, "Missing required body param status");
      return;
    }

    if (req.body.amount === undefined || req.body.amount === null) {
      this.sendBadRequest(res, "Missing required body param amount.");
      return;
    }

    const amount = parseFloat(req.body.amount);
    if (Number.isNaN(amount)) {
      this.sendBadRequest(res, `Invalid amount "${amount}".`);
      return;
    }

    if (amount <= 0) {
      this.sendBadRequest(res, "Amount cannot be negative or 0.");
      return;
    }

    const deliveryPlaceId = req.body.deliveryPlaceId;
    if (!deliveryPlaceId) {
      this.sendBadRequest(res, "Missing required body param deliveryPlaceId");
      return;
    }

    const databaseDeliveryPlace = await models.findDeliveryPlaceByExternalId(deliveryPlaceId);
    if (!databaseDeliveryPlace) {
      this.sendNotFound(res);
      return;
    }

    const price = req.body.price;
    const qualityId = req.body.qualityId;

    const deliveryQuality = qualityId ? await models.findDeliveryQuality(qualityId) : null;
    if (qualityId && !deliveryQuality) {
      this.sendBadRequest(res, "Invalid qualityId");
      return;
    }

    if (status === "DONE" && !deliveryQuality) {
      this.sendBadRequest(res, "Missing qualityId");
      return;
    }

    if (status === "DONE" && deliveryQuality) {
      const product: ProductModel = await models.findProductById(productId);
      if (!product || !product.id) {
        this.sendInternalServerError(res, "Failed to resolve product");
        return;
      }

      const productPrice = await this.getProductPriceAtTime(product.id, time);
      if (!productPrice) {
        this.sendInternalServerError(res, "Failed to resolve product price");
        return;
      }

      const unitPrice = parseFloat(productPrice);

      const bonusPrice = amount * product.units * product.unitSize * deliveryQuality.priceBonus;
      const totalPrice = unitPrice * amount + bonusPrice;
      const unitPriceWithBonus = totalPrice / amount;

      if (unitPrice < 0 || unitPriceWithBonus < 0) {
        this.sendInternalServerError(res, "Failed to resolve price");
        return;
      }

      const receivingUserId = this.getLoggedUserId(req);
      const deliveryContact: UserRepresentation | null = await userManagement.findUser(req.body.userId);
      if (!deliveryContact) {
        this.sendInternalServerError(res, "Failed to deliveryContact");
        return;
      }

      const receivingContact: UserRepresentation | null = await userManagement.findUser(receivingUserId);
      if (!receivingContact) {
        this.sendInternalServerError(res, "Failed to receivingContact");
        return;
      }

      const deliveryContactSapId = userManagement.getSingleAttribute(deliveryContact, UserProperty.SAP_BUSINESS_PARTNER_CODE);
      const sapSalesPersonCode = userManagement.getSingleAttribute(receivingContact, UserProperty.SAP_SALES_PERSON_CODE);

      if (!deliveryContactSapId) {
        this.sendBadRequest(res, `Missing sapId on delivering user ${deliveryContact.id}`);
        return;
      }

      if (!sapSalesPersonCode) {
        this.sendBadRequest(res, `Missing sapSalesPersonCode on receiving user ${receivingContact.id}`);
        return;
      }

      const itemGroup = await models.findItemGroupById(product.itemGroupId);

      if (!itemGroup) {
        this.sendNotFound(res, `Item group for product ${productId} not found`);
      }

      const databaseDelivery = await models.createDelivery(uuid(), productId, userId, time, status, amount, price, unitPrice, unitPriceWithBonus, qualityId, databaseDeliveryPlace.id, false);

      try {
        await this.createSapPurchaseDeliveryNote(
          databaseDelivery,
          databaseDeliveryPlace,
          product,
          Number(deliveryContactSapId),
          Number(sapSalesPersonCode),
          unitPriceWithBonus,
          itemGroup.category as ItemGroupCategory
        );

        if (databaseDelivery.id) {
          await models.updateDelivery(databaseDelivery.id, productId, userId, time, status, amount, unitPrice, unitPriceWithBonus, qualityId, databaseDeliveryPlace.id, true);
        }

        const loans: DeliveryLoan[] | undefined = req.body.loans;
        if (!!loans && Array.isArray(loans) && !!loans.length) {
          const deliveryNotes = await models.listDeliveryNotes(databaseDelivery.id);

          await this.createSapStockTransfer(
            loans,
            Number(deliveryContactSapId),
            Number(sapSalesPersonCode),
            new Date(databaseDelivery.time),
            deliveryNotes.map(note => note.text || "")
          );
        }
      } catch (error) {
        logReject(error, getLogger());
      }

      res.status(200).send(await this.translateDatabaseDelivery(databaseDelivery));
    } else {
      const result = await models.createDelivery(uuid(), productId, userId, time, status, amount, price, null, null, qualityId, databaseDeliveryPlace.id, false);
      res.status(200).send(await this.translateDatabaseDelivery(result));
    }
  }

  /**
   * @inheritdoc
   */
  public async createDeliveryNote(req: Request, res: Response) {
    const deliveryId = req.params.deliveryId;
    if (!deliveryId) {
      this.sendBadRequest(res, "Missing required body param deliveryId");
      return;
    }

    const databaseDelivery = await models.findDeliveryById(deliveryId);
    if (!databaseDelivery) {
      this.sendNotFound(res);
      return;
    }

    const text = req.body.text;
    const image = req.body.image;

    const result = await models.createDeliveryNote(uuid(), deliveryId, text, image);
    res.status(200).send(await this.translateDatabaseDeliveryNote(result));
  }

  /**
   * @inheritdoc
   */
  public async deleteDelivery(req: Request, res: Response) {
    const deliveryId = req.params.deliveryId;
    if (!deliveryId) {
      this.sendBadRequest(res, "Missing required param deliveryId");
      return;
    }

    const databaseDelivery = await models.findDeliveryById(deliveryId);
    if (!databaseDelivery) {
      this.sendNotFound(res);
      return;
    }

    const loggedUserId = this.getLoggedUserId(req);
    if (loggedUserId !== databaseDelivery.userId && !this.hasRealmRole(req, ApplicationRoles.DELETE_OTHER_DELIVERIES)) {
      this.sendForbidden(res, "You are not allowed to delete other users deliveries");
      return;
    }

    await models.deleteDeliveryById(deliveryId);
    res.status(204).send();
  }

  /**
   * @inheritdoc
   */
  public async deleteDeliveryNote(req: Request, res: Response) {
    const deliveryNoteId = req.params.deliveryNoteId;
    if (!deliveryNoteId) {
      this.sendBadRequest(res, "Missing required param deliveryNoteId");
      return;
    }

    const databaseDeliveryNote = await models.findDeliveryNoteById(deliveryNoteId);
    if (!databaseDeliveryNote) {
      this.sendNotFound(res);
      return;
    }

    const databaseDelivery = await models.findDeliveryById(databaseDeliveryNote.deliveryId);
    if (!databaseDelivery) {
      this.sendNotFound(res);
      return;
    }

    const loggedUserId = this.getLoggedUserId(req);
    if (loggedUserId !== databaseDelivery.userId && !this.hasRealmRole(req, ApplicationRoles.DELETE_OTHER_DELIVERIES)) {
      this.sendForbidden(res, "You are not allowed to delete other users deliveries");
      return;
    }

    await models.deleteDeliveryNoteById(deliveryNoteId);
    res.status(204).send();
  }

  /**
   * @inheritdoc
   */
  public async findDelivery(req: Request, res: Response) {
    const deliveryId = req.params.deliveryId;
    if (!deliveryId) {
      this.sendBadRequest(res, "Missing required param deliveryId");
      return;
    }

    const databaseDelivery = await models.findDeliveryById(deliveryId);
    if (!databaseDelivery) {
      this.sendNotFound(res);
      return;
    }

    const loggedUserId = this.getLoggedUserId(req);
    if (loggedUserId !== databaseDelivery.userId && !this.hasRealmRole(req, ApplicationRoles.LIST_AND_FIND_OTHER_DELIVERIES)) {
      this.sendForbidden(res, "You are not allowed to find other users deliveries");
      return;
    }

    res.status(200).send(await this.translateDatabaseDelivery(databaseDelivery));
  }

  /**
   * @inheritdoc
   */
  public async findDeliveryNote(req: Request, res: Response) {
    const deliveryNoteId = req.params.deliveryNoteId;
    if (!deliveryNoteId) {
      this.sendBadRequest(res, "Missing required param deliveryNoteId");
      return;
    }

    const databaseDeliveryNote = await models.findDeliveryNoteById(deliveryNoteId);
    if (!databaseDeliveryNote) {
      this.sendNotFound(res);
      return;
    }

    const databaseDelivery = await models.findDeliveryById(databaseDeliveryNote.deliveryId);
    if (!databaseDelivery) {
      this.sendNotFound(res);
      return;
    }

    const loggedUserId = this.getLoggedUserId(req);
    if (loggedUserId !== databaseDelivery.userId && !this.hasRealmRole(req, ApplicationRoles.LIST_AND_FIND_OTHER_DELIVERIES)) {
      this.sendForbidden(res, "You are not allowed to find other users delivery notes");
      return;
    }

    res.status(200).send(await this.translateDatabaseDeliveryNote(databaseDeliveryNote));
  }

  /**
   * @inheritdoc
   */
  public async listDeliveries(req: Request, res: Response){
    const status = req.query.status || null;
    const itemGroupCategory = req.query.itemGroupCategory || null;
    const itemGroupId = req.query.itemGroupId || null;
    const productId = req.query.productId || null;
    const userId = req.query.userId || null;
    const deliveryPlaceId = req.query.deliveryPlaceId || null;
    const timeBefore = req.query.timeBefore || null;
    const timeAfter = req.query.timeAfter || null;
    const firstResult = parseInt(req.query.firstResult) || 0;
    const maxResults = parseInt(req.query.maxResults) || 5;

    let databaseDeliveryPlaceId = null;
    if (deliveryPlaceId) {
      const databaseDeliveryPlace = await models.findDeliveryPlaceByExternalId(deliveryPlaceId);
      if (!databaseDeliveryPlace) {
        this.sendBadRequest(res, "Malformed delivery place id");
        return;
      }
      databaseDeliveryPlaceId = databaseDeliveryPlace ? databaseDeliveryPlace.id : null;
    }

    const databaseItemGroup = await models.findItemGroupByExternalId(itemGroupId);
    const databaseItemGroupId = databaseItemGroup ? databaseItemGroup.id : null;

    const loggedUserId = this.getLoggedUserId(req);
    if (userId && loggedUserId !== userId && !this.hasRealmRole(req, ApplicationRoles.LIST_AND_FIND_OTHER_DELIVERIES)) {
      this.sendForbidden(res, "You have no permission to list other users deliveries");
      return;
    }

    if (!userId && !this.hasRealmRole(req, ApplicationRoles.LIST_AND_FIND_OTHER_DELIVERIES)) {
      this.sendForbidden(res, "You have no permission to list all deliveries");
      return;
    }

    const deliveries: DeliveryModel[] = await models.listDeliveries(status, userId, itemGroupCategory, databaseItemGroupId, productId ? [ productId ] : null, databaseDeliveryPlaceId, timeBefore, timeAfter, firstResult, maxResults);
    res.status(200).send(await Promise.all(deliveries.map((delivery) => {
      return this.translateDatabaseDelivery(delivery);
    })));
  }

  /**
   * @inheritdoc
   */
  public async listDeliveryNotes(req: Request, res: Response) {
    const deliveryId = req.params.deliveryId;
    const deliveryNotes: DeliveryNoteModel[] = await models.listDeliveryNotes(deliveryId);

    res.status(200).send(await Promise.all(deliveryNotes.map((deliveryNote) => {
      return this.translateDatabaseDeliveryNote(deliveryNote);
    })));
  }

  /**
   * @inheritdoc
   */
  public async updateDelivery(req: Request, res: Response) {
    const deliveryId = req.params.deliveryId;
    if (!deliveryId) {
      this.sendBadRequest(res, "Missing required body param deliveryId");
      return;
    }

    const delivery = await models.findDeliveryById(deliveryId);
    if (!delivery) {
      this.sendNotFound(res);
      return;
    }

    const payload: Delivery = req.body;

    const productId = payload.productId;
    if (!productId) {
      this.sendBadRequest(res, "Missing required body param productId");
      return;
    }

    const userId = payload.userId;
    if (!userId) {
      this.sendBadRequest(res, "Missing required body param userId");
      return;
    }

    const time = payload.time;
    if (!time) {
      this.sendBadRequest(res, "Missing required body param time");
      return;
    }

    const status = payload.status;
    if (!status) {
      this.sendBadRequest(res, "Missing required body param status");
      return;
    }

    const amount = req.body.amount as number | undefined;

    if (amount === undefined) {
      this.sendBadRequest(res, "Amount is required.");
      return;
    }

    if (amount <= 0) {
      this.sendBadRequest(res, "Amount cannot be negative or 0.");
      return;
    }

    const deliveryPlaceId = payload.deliveryPlaceId;
    if (!deliveryPlaceId) {
      this.sendBadRequest(res, "Missing required body param deliveryPlaceId");
      return;
    }

    const databaseDeliveryPlace = await models.findDeliveryPlaceByExternalId(deliveryPlaceId);
    if (!databaseDeliveryPlace) {
      this.sendNotFound(res);
      return;
    }

    const qualityId = payload.qualityId;
    const deliveryQuality = qualityId ? await models.findDeliveryQuality(qualityId) : null;
    if (qualityId && !deliveryQuality) {
      this.sendBadRequest(res, "Invalid qualityId");
      return;
    }

    if (!this.hasRealmRole(req, ApplicationRoles.LIST_AND_FIND_OTHER_DELIVERIES)) {
      if (delivery.status === "DONE" || delivery.status === "NOT_ACCEPTED") {
        this.sendForbidden(res, "You are not allowed to change already done or not accepted delivery");
        return;
      }

      if (status === "DONE") {
        this.sendForbidden(res, "You are not allowed to change delivery status to done");
        return;
      }
    }

    if (status === "DONE" && !deliveryQuality) {
      this.sendBadRequest(res, "Missing qualityId");
      return;
    }

    let databaseDelivery = null;
    if (status === "DONE" && deliveryQuality) {
      const product: ProductModel = await models.findProductById(productId);
      if (!product || !product.id) {
        this.sendInternalServerError(res, "Failed to resolve product");
        return;
      }

      const productPrice = await this.getProductPriceAtTime(product.id, time);
      if (!productPrice) {
        this.sendInternalServerError(res, "Failed to resolve product price");
        return;
      }

      const unitPrice = parseFloat(productPrice);

      const bonusPrice = amount * product.units * product.unitSize * deliveryQuality.priceBonus;
      const totalPrice = unitPrice * amount + bonusPrice;
      const unitPriceWithBonus = totalPrice / amount;

      if (unitPrice < 0 || unitPriceWithBonus < 0) {
        this.sendInternalServerError(res, "Failed to resolve price");
        return;
      }

      const receivingUserId = this.getLoggedUserId(req);
      const deliveryContact: UserRepresentation | null = await userManagement.findUser(delivery.userId);
      if (!deliveryContact) {
        this.sendInternalServerError(res, "Failed to deliveryContact");
        return;
      }

      const receivingContact: UserRepresentation | null = await userManagement.findUser(receivingUserId);
      if (!receivingContact) {
        this.sendInternalServerError(res, "Failed to receivingContact");
        return;
      }

      const deliveryContactSapId = userManagement.getSingleAttribute(deliveryContact, UserProperty.SAP_BUSINESS_PARTNER_CODE);
      const sapSalesPersonCode = userManagement.getSingleAttribute(receivingContact, UserProperty.SAP_SALES_PERSON_CODE);

      if (!deliveryContactSapId) {
        this.sendBadRequest(res, `Missing sapId on delivering user ${deliveryContact.id}`);
        return;
      }

      if (!sapSalesPersonCode) {
        this.sendBadRequest(res, `Missing sapSalesPersonCode on receiving user ${receivingContact.id}`);
        return;
      }

      const itemGroup = await models.findItemGroupById(product.itemGroupId);

      await models.updateDelivery(deliveryId, productId, userId, time, status, amount, unitPrice, unitPriceWithBonus, qualityId, databaseDeliveryPlace.id, delivery.inSap);

      databaseDelivery = await models.findDeliveryById(deliveryId);

      try {
        if (!databaseDelivery.inSap) {
          await this.createSapPurchaseDeliveryNote(
            databaseDelivery,
            databaseDeliveryPlace,
            product,
            Number(deliveryContactSapId),
            Number(sapSalesPersonCode),
            unitPriceWithBonus,
            itemGroup.category as ItemGroupCategory
          );

          await models.updateDelivery(deliveryId, productId, userId, time, status, amount, unitPrice, unitPriceWithBonus, qualityId, databaseDeliveryPlace.id, true);

          const loans: DeliveryLoan[] | undefined = req.body.loans;

          if (!!loans && Array.isArray(loans) && loans.length) {
            const deliveryNotes = await models.listDeliveryNotes(databaseDelivery.id);

            await this.createSapStockTransfer(
              loans,
              Number(deliveryContactSapId),
              Number(sapSalesPersonCode),
              new Date(databaseDelivery.time),
              deliveryNotes.map(note => note.text || "")
            );
          }
        }
      } catch (e) {
        logReject(e, getLogger());
      }
    } else {
      await models.updateDelivery(deliveryId, productId, userId, time, status, amount, null, null, qualityId, databaseDeliveryPlace.id, delivery.inSap);
      databaseDelivery = await models.findDeliveryById(deliveryId);

      if (databaseDelivery.status === "REJECTED" || databaseDelivery.status === "NOT_ACCEPTED") {
        const deliveryContact: UserRepresentation | null = await userManagement.findUser(delivery.userId);
        const deliveryPlace = await models.findDeliveryPlaceById(delivery.deliveryPlaceId);

        const loggedUserId = this.getLoggedUserId(req);
        const loggedUser = await userManagement.findUser(loggedUserId);

        if (!loggedUser) {
          this.sendInternalServerError(res, "Failed to get logged in user");
          return;
        }

        if (!deliveryContact) {
          this.sendInternalServerError(res, "Failed to deliveryContact");
          return;
        }

        const product: ProductModel = await models.findProductById(productId);
        if (!product || !product.id) {
          this.sendInternalServerError(res, "Failed to resolve product");
          return;
        }

        const itemGroup = await models.findItemGroupById(product.itemGroupId);
        const category: ItemGroupCategory = itemGroup.category == "FROZEN" ? "FROZEN" : "FRESH";

        const loggedUserInfo = `${loggedUser.firstName || ""} ${loggedUser.lastName || ""} (${loggedUser.email})`;

        const sender = `${config().mail.sender}@${config().mail.domain}`;
        const contactConfig = config().contacts;

        const deliveryNotes = await models.listDeliveryNotes(delivery.id);
        const latestDeliveryNote = deliveryNotes.length > 0 ? deliveryNotes.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0] : undefined;
        const imageAttachment = latestDeliveryNote && latestDeliveryNote.image ? Buffer.from(latestDeliveryNote.image, "base64") : undefined;

        const additionalRejectionInfo = latestDeliveryNote ? `Lisätietoja hylkäyksestä: ${latestDeliveryNote.text}` : "";

        const deliveryInfoToRecipient: string[] = [
          `Toimittaja: ${deliveryContact.firstName} ${deliveryContact.lastName}`,
          `Tuote: ${product.name}`,
          `Määrä: ${databaseDelivery.amount}`,
          `Toimituspaikka: ${deliveryPlace["name"]}`,
          `Ajankohta: ${moment(databaseDelivery.time).format("DD.MM.YYYY")} klo ${moment(databaseDelivery.time).format("HH.mm")}`,
          `Luomispäivä: ${moment(databaseDelivery.createdAt).format("DD.MM.YYYY")} klo ${moment(databaseDelivery.time).format("HH.mm")}`,
          `Päivitetty: ${moment(databaseDelivery.updatedAt).format("DD.MM.YYYY")} klo ${moment(databaseDelivery.time).format("HH.mm")}`
        ];

        const deliveryInfoToShipper: string[] = [
          `Toimittaja: ${deliveryContact.firstName} ${deliveryContact.lastName}`,
          `Tuote: ${product.name}`,
          `Määrä: ${databaseDelivery.amount}`,
          `Toimituspaikka: ${deliveryPlace["name"]}`,
          `Ajankohta: ${moment(databaseDelivery.time).format("DD.MM.YYYY")} klo ${moment(databaseDelivery.time).format("HH.mm")}\n`,
          `Toimitus luotu appiin: ${moment(databaseDelivery.createdAt).format("DD.MM.YYYY")} klo ${moment(databaseDelivery.time).format("HH.mm")}`,
          `Toimitus viimeksi päivitetty: ${moment(databaseDelivery.updatedAt).format("DD.MM.YYYY")} klo ${moment(databaseDelivery.time).format("HH.mm")}`
        ]

        const additionalInfoToShipper: string[] = category === "FRESH" ? [
          "Tuoremarjatoimisto",
          "puh. 020 709 9588",
          contactConfig!.notifications!.fresh || ""
        ] : [
          "Pakastelaituri",
          "puh. 020 709 9585",
          contactConfig!.notifications!.frozen || ""
        ];

        /**Email data for shipper */
        const subjectToShipper = `Marjatoimitus hylätty`;
        const contentsToShipper = `Vastaanottaja on hylännyt toimituksen, jonka ajankohta oli ${moment(databaseDelivery.time).format("DD.MM.YYYY")} klo ${moment(databaseDelivery.time).format("HH.mm")}.${latestDeliveryNote ? `\n\n${additionalRejectionInfo}` : ""}\n\nToimituksen tiedot:\n\n${deliveryInfoToShipper.join("\n")}\n\nLisätietoja:\n${additionalInfoToShipper.join("\n")}\n\n--------------------------------------------------\nTämä on automaattinen sähköposti. Älä vastaa tähän\n--------------------------------------------------`;

        /**Email data for recipient */
        const subjectToRecipient = `Ilmoitus toimituksen hylkäyksestä lähetetty`;
        const contentsToRecipient = `Käyttäjä ${loggedUserInfo} on hylännyt toimituksen. Ilmoitus lähetetty toimittajalle toimituksen hylkäyksestä.${latestDeliveryNote ? `\n\n${additionalRejectionInfo}` : ""}\n\nToimituksen tiedot:\n\n${deliveryInfoToRecipient.join("\n")}\n--------------------------------------------------\nTämä on automaattinen sähköposti. Älä vastaa tähän\n--------------------------------------------------`;

        if (
          contactConfig &&
          contactConfig.notifications &&
          contactConfig.notifications.deliveryRejections
        ) {
          contactConfig.notifications.deliveryRejections.forEach(rejectionEmail => {
            mailer.send(sender, rejectionEmail, subjectToRecipient, contentsToRecipient);
          });
        }

        const shipperEmail = deliveryContact.email;
        if (shipperEmail) {
          mailer.send(sender, shipperEmail, subjectToShipper, contentsToShipper, imageAttachment);
        }
      }
    }

    res.status(200).send(await this.translateDatabaseDelivery(databaseDelivery));
  }

  /**
   * @inheritdoc
   */
  public async updateDeliveryNote(req: Request, res: Response) {
    const deliveryId = req.params.deliveryId;
    if (!deliveryId) {
      this.sendBadRequest(res, "Missing required body param deliveryId");
      return;
    }

    const deliveryNoteId = req.params.deliveryNoteId;
    if (!deliveryNoteId) {
      this.sendBadRequest(res, "Missing required body param deliveryNoteId");
      return;
    }

    const databaseDelivery = await models.findDeliveryById(deliveryId);
    if (!databaseDelivery) {
      this.sendNotFound(res);
      return;
    }

    const text = req.body.text;
    const image = req.body.image;

    await models.updateDeliveryNote(deliveryNoteId, deliveryId, text, image);
    const databaseDeliveryNote = await models.findDeliveryNoteById(deliveryNoteId);

    res.status(200).send(await this.translateDatabaseDeliveryNote(databaseDeliveryNote));
  }

  /**
   * Creates SAP purchase delivery note
   *
   * @param delivery delivery
   * @param deliveryPlace delivery place
   * @param product product
   * @param businessPartnerCode business partner code
   * @param salesPersonCode SAP sales person code
   * @param price price
   * @param itemGroupCategory item group category
   */
  private createSapPurchaseDeliveryNote = async (
    delivery: DeliveryModel,
    deliveryPlace: DeliveryPlaceModel,
    product: ProductModel,
    businessPartnerCode: number,
    salesPersonCode: number,
    price: number,
    itemGroupCategory: ItemGroupCategory
  ) => {
    const deliveryNotes = await models.listDeliveryNotes(delivery.id);
    const deliveryComments = this.joinComments(deliveryNotes.map(note => note.text || ""));
    const batchNumbers = this.getSapPurchaseDeliveryNoteBatchNumbers(product, delivery, businessPartnerCode);

    try {
      const purchaseDeliveryNotesApi = await ErpClient.getPurchaseDeliveryNotesApi();
      const response = await purchaseDeliveryNotesApi.createPurchaseDeliveryNote({
        businessPartnerCode: businessPartnerCode,
        docDate: moment(delivery.time).format("YYYY-MM-DD"),
        salesPersonCode: salesPersonCode,
        comments: deliveryComments,
        lines: [{
          itemCode: Number(product.sapItemCode),
          quantity: delivery.amount,
          unitPrice: price,
          warehouseCode: deliveryPlace.sapId,
          batchNumbers: batchNumbers
        }]
      });

      return response.body;
    } catch (error) {
      const emailAddresses = this.getErrorEmailAddresses(itemGroupCategory);

      if (emailAddresses) {
        const description: string[] = [];

        description.push(`
          Toimituksen tiedot:\n\n
          Päiväys: ${moment(delivery.time).format("DD.MM.YYYY [klo] HH.mm")}\n
          Viljelijän SAP-tunnus: ${businessPartnerCode}\n
          Toimitetun marjan SAP-tunnus: ${product.sapItemCode}\n
          Toimitettu määrä: ${delivery.amount}\n
          Yksikköhinta: ${price}\n
          Kommentti: ${deliveryComments || ""}
        `);

        this.sendErrorMails(
          emailAddresses,
          "Appi-toimituksen vienti SAP:iin epäonnistui",
          description,
          error instanceof Error ? error.stack || error.message : error.toString()
        );
      } else {
        logReject(
          "No error email sent from failed delivery purchase note creation because email addresses are not configured",
          getLogger()
        );
      }

      return Promise.reject(
        createStackedReject(
          "Create SAP delivery purchase note request failed.",
          error instanceof HttpError ?
            new Error(`${error.message}: ${JSON.stringify(error.body) || ""}`) :
            error
        )
      );
    }
  }

  /**
   * Create SAP stock transfer
   *
   * @param loans loans
   * @param businessPartnerCode business partner code
   * @param salesPersonCode sales person code
   * @param docDate doc date
   * @param comments comments
   * @return promise of successful creation
   */
  private createSapStockTransfer = async (
    loans: DeliveryLoan[],
    businessPartnerCode: number,
    salesPersonCode: number,
    docDate: Date,
    comments: string[]
  ): Promise<SapStockTransfer | undefined> => {
    try {
      if (!loans.length) return;

      const stockTransferLines = this.translateLoans(loans);

      if (stockTransferLines.length < 1) {
        throw new Error(`Stock transfer lines could not be constructed from following loans: ${JSON.stringify(loans, null, 2)}`);
      }

      const stockTransfersApi = await ErpClient.getStockTransfersApi();
      const result = await stockTransfersApi.createStockTransfer({
        businessPartnerCode: businessPartnerCode,
        docDate: moment(docDate).format("YYYY-MM-DD"),
        fromWarehouse: "100",
        toWarehouse: "100",
        salesPersonCode: salesPersonCode,
        lines: stockTransferLines,
        comments: this.joinComments(comments)
      });

      return result.body;
    } catch (error) {
      return Promise.reject(
        createStackedReject(
          "Create SAP stock transfer request failed.",
          error instanceof HttpError ?
            new Error(`${error.message}: ${JSON.stringify(error.body) || ""}`) :
            error
        )
      );
    }
  }

  /**
   * Returns SAP purchase delivery note batch numbers from given product
   *
   * @param product product
   * @param delivery delivery
   * @param businessPartnerCode business partner code
   */
  private getSapPurchaseDeliveryNoteBatchNumbers = (
    product: ProductModel,
    delivery: DeliveryModel,
    businessPartnerCode: number
  ): SapBatchNumber[] => {
    const batchProductCodes = config().sap.batchProducts;

    if (!batchProductCodes) {
      logReject("Batch product codes list not found from configuration", getLogger());
    }

    if ((batchProductCodes || []).every(batchProductCode => batchProductCode !== product.sapItemCode)) {
      return [];
    }

    return [{
      batchNumber: `${moment(delivery.time).format("YYYYMMDD")}_${businessPartnerCode}`,
      quantity: delivery.amount
    }];
  }

  /**
   * Translates delivery loans to SAP stock transfer lines
   *
   * @param loans loans
   */
  private translateLoans = (loans: DeliveryLoan[]): SapStockTransferLine[] => {
    return loans.reduce<SapStockTransferLine[]>((lines, loan) => {
      const { item, loaned, returned } = loan;
      const itemCode: string = _.get(config(), [ "sap", "loanProductIds", item ]);

      if (!itemCode) {
        throw new Error(`SAP item code not found for loan item ${item}`);
      }

      if (returned > 0) {
        lines.push({
          itemCode: Number(itemCode),
          quantity: returned,
          binAllocations: [
            { absEntry: 2, actionType: BinActionType.ToWarehouse },
            { absEntry: 3, actionType: BinActionType.FromWarehouse },
          ]
        });
      }

      if (loaned > 0) {
        lines.push({
          itemCode: Number(itemCode),
          quantity: loaned,
          binAllocations: [
            { absEntry: 3, actionType: BinActionType.ToWarehouse },
            { absEntry: 2, actionType: BinActionType.FromWarehouse },
          ]
        });
      }

      return lines;
    }, []);
  };

  /**
   * Joins list of comments to single comment string
   *
   * @param comments list of comments
   */
  private joinComments = (comments: string[]) => {
    return _.truncate(comments.join(" ; "), { "length": 253 });
  }

  /**
   * Translates database delivery into REST entity
   *
   * @param delivery delivery
   */
  private async translateDatabaseDelivery(delivery: DeliveryModel): Promise<Delivery> {
    const deliveryPlace = await models.findDeliveryPlaceById(delivery.deliveryPlaceId);

    return {
      id: delivery.id,
      productId: delivery.productId,
      userId: delivery.userId,
      time: delivery.time,
      status: delivery.status,
      amount: delivery.amount,
      price: delivery.unitPriceWithBonus ? delivery.unitPriceWithBonus.toFixed(2) : null,
      qualityId: delivery.qualityId,
      deliveryPlaceId: deliveryPlace.externalId,
      warehouseCode: delivery.warehouseCode,
      loans: []
    };
  }

  /**
   * Returns current price for a product
   *
   * @param productId product id
   * @return product price or null if not found
   */
  private async getProductPriceAtTime(productId: string, date: Date): Promise<string | null> {
    const price = await models.findProductPriceAtTime(productId, date);
    return price ? price.price : null;
  }

  /**
   * Translates database delivery note into REST entity
   *
   * @param deliveryNote deliveryNote
   */
  private translateDatabaseDeliveryNote = (deliveryNote: DeliveryNoteModel): DeliveryNote => ({
    id: deliveryNote.id,
    text: deliveryNote.text,
    image: deliveryNote.image
  });

  /**
   * Send email messages about logged error
   *
   * @param recipients message recipients
   * @param subject message subject
   * @param description message description as list of paragraphs
   * @param errorStack possible error stack
   */
  private sendErrorMails = (
    recipients: string[],
    subject: string,
    description: string[],
    errorStack?: string
  ) => {
    const contentParts: string[] = Array.from(description);

    if (errorStack) {
      contentParts.push("===============================================");
      contentParts.push("Tekninen virhekooste:");
      contentParts.push(errorStack);
    }

    for (const recipient of recipients) {
      mailer.send(
        `${config().mail.sender}@${config().mail.domain}`,
        recipient,
        subject,
        contentParts.join("\n\n")
      );
    }
  }

  /**
   * Returns email addresses for error messages
   *
   * @param itemGroupCategory item group category
   * @returns list of email addresses or undefined if addresses are not found from configuration
   */
  private getErrorEmailAddresses = (itemGroupCategory: "FRESH" | "FROZEN"): string[] | undefined => {
    const { contacts } = config();
    const { notifications } = contacts || {};
    const { errors } = notifications || {};

    if (!errors) return undefined;

    if (itemGroupCategory === "FRESH") {
      return errors.fresh && errors.fresh.length ? errors.fresh : undefined;
    } else {
      return errors.frozen && errors.frozen.length ? errors.frozen : undefined;
    }
  }

}