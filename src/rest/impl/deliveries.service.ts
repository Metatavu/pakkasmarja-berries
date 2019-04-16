import { Application, Response, Request } from "express";
import * as Keycloak from "keycloak-connect";
import models, { DeliveryModel, DeliveryNoteModel, ProductModel } from "../../models";
import DeliveriesService from "../api/deliveries.service";
import { Delivery, DeliveryNote, Contact } from "../model/models";
import ApplicationRoles from "../application-roles";
import * as uuid from "uuid/v4";
import PurchaseMessageBuilder from "../../sap/purchase-builder";
import moment = require("moment");
import userManagement from "../../user-management";
import { config } from "../../config";
import * as fs from "fs";

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

    const amount = req.body.amount;
    if (!amount) {
      this.sendBadRequest(res, "Missing required body param amount");
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

    const result = await models.createDelivery(uuid(), productId, userId, time, status, amount, price, qualityId, databaseDeliveryPlace.id);
    res.status(200).send(await this.translateDatabaseDelivery(result));
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

    const databaseDeliveryPlace = await models.findDeliveryPlaceById(deliveryPlaceId);
    const databaseDeliveryPlaceId = databaseDeliveryPlace ? databaseDeliveryPlace.id : null;

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

    const deliveries: DeliveryModel[] = await models.listDeliveries(status, userId, itemGroupCategory, databaseItemGroupId, productId, databaseDeliveryPlaceId, timeBefore, timeAfter, firstResult, maxResults);
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

    const amount = req.body.amount;
    if (!amount) {
      this.sendBadRequest(res, "Missing required body param amount");
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

    await models.updateDelivery(deliveryId, productId, userId, time, status, amount, price, qualityId, databaseDeliveryPlace.id);
    const databaseDelivery = await models.findDeliveryById(deliveryId);

    if (databaseDelivery.status === "DONE") {
      await this.buildPurchaseXML(databaseDelivery, this.getLoggedUserId(req));
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
   * Build purchase XML
   * 
   * @param delivery delivery
   * @param receivingUserId receivingUserId
   */
  private async buildPurchaseXML(delivery: DeliveryModel, receivingUserId: string) {
    const builder = new PurchaseMessageBuilder();

    const date: string = moment(delivery.time).format("YYYYMMDD");
    const deliveryContact: Contact = await userManagement.findUser(delivery.userId);
    const receivingContact: Contact = await userManagement.findUser(receivingUserId);
    const deliveryContactSapId = userManagement.getSingleAttribute(deliveryContact, "sapId");
    const receivingContactSapId = userManagement.getSingleAttribute(receivingContact, "sapId");
    const product: ProductModel = await models.findProductById(delivery.productId);
    const itemGroup = await models.findItemGroupById(product.itemGroupId);
    const itemCode: string = itemGroup.name.split("/")[0];
    const notes = await this.getNotesString(delivery.id);
    const latestPrice = await this.getLatestItemGroupPrice(itemGroup.id);

    builder.setPurchaseReceiptHeader({
      DocDate: date,
      CardCode: deliveryContactSapId || `Missing sapId on user ${deliveryContact.id}`,
      Comments: notes,
      WarehouseCode: "01",
      SalesPersonCode: receivingContactSapId || `Missing sapId on user ${deliveryContact.id}`,
    });

    builder.setTransferHeader({
      CardCode: deliveryContactSapId || `Missing sapId on user ${deliveryContact.id}`,
      DocDate: date,
      Comments: notes,
      WarehouseCode: "100",
      FromWarehouseCode: "100",
      SalesPersonCode: receivingContactSapId || `Missing sapId on user ${deliveryContact.id}`,
    });

    builder.addPurchaseReceiptLine({
      ItemCode: itemCode,
      Quantity: delivery.amount,
      Price: latestPrice,
      UnitPrice: latestPrice,
      WarehouseCode: "100",
      U_PFZ_REF: ""
    });

    builder.addTransferLine({
      ItemCode: itemCode,
      Quantity: delivery.amount,
      BinAllocations: [
        {
          BinAbsEntry: 2,
          BinActionType: "batToWarehouse",
          Quantity: 0
        }, {
          BinAbsEntry: 3,
          BinActionType: "batFromWarehouse",
          Quantity: 0
        }
      ]
    });

    const xml = builder.buildXML();
    const filePath = `${config().sap["xml-fileupload-path"]}/${delivery.id ? delivery.id : Date.now().toString()}.xml`;

    fs.writeFile(filePath, xml, (err: any) => {
      if (err) throw(err);
      console.log(`Done writing ${filePath}`);
    });
  }

  /**
   * Translates database delivery into REST entity
   * 
   * @param delivery delivery 
   */
  private async translateDatabaseDelivery(delivery: DeliveryModel) {
    const deliveryPlace = await models.findDeliveryPlaceById(delivery.deliveryPlaceId);

    const result: Delivery = {
      "id": delivery.id,
      "productId": delivery.productId,
      "userId": delivery.userId,
      "time": delivery.time,
      "status": delivery.status,
      "amount": delivery.amount,
      "price": delivery.price,
      "qualityId": delivery.qualityId,
      "deliveryPlaceId": deliveryPlace.externalId
    };

    return result;
  }

  /**
   * Get latest item group price
   * 
   * @param itemGroupId itemGroupId
   * @return price
   */
  private async getLatestItemGroupPrice(itemGroupId: number) {
    const year = new Date().getFullYear();
    const prices = await models.listItemGroupPrices(itemGroupId, year);

    const sorted = prices.sort((a, b) => {
      const aDate = a.createdAt;
      const bDate = b.createdAt;
      
      return bDate.getTime() - aDate.getTime()
    });

    if (sorted[0].price) {
      return parseInt(sorted[0].price);
    }

    return 0;
  }

  /**
   * Get notes
   * 
   * @param deliveryId deliveryId
   * @return notes
   */
  private async getNotesString(deliveryId: string | null) {
    if (!deliveryId) {
      return "";
    }

    const deliveryNotes = await models.listDeliveryNotes(deliveryId);
    const notes = deliveryNotes.map((deliveryNote) => {
      return deliveryNote.text;
    });
    
    return notes.join(" ; ");
  }

  /**
   * Translates database delivery note into REST entity
   * 
   * @param deliveryNote deliveryNote 
   */
  private async translateDatabaseDeliveryNote(deliveryNote: DeliveryNoteModel) {
    const result: DeliveryNote = {
      "id": deliveryNote.id,
      "text": deliveryNote.text,
      "image": deliveryNote.image
    };

    return result;
  }

}