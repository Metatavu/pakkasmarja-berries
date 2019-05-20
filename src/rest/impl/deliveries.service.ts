import { Application, Response, Request } from "express";
import * as Keycloak from "keycloak-connect";
import models, { DeliveryModel, DeliveryNoteModel, ProductModel, DeliveryPlaceModel } from "../../models";
import DeliveriesService from "../api/deliveries.service";
import { Delivery, DeliveryNote, DeliveryLoan } from "../model/models";
import ApplicationRoles from "../application-roles";
import * as uuid from "uuid/v4";
import PurchaseMessageBuilder, { TransferLine, TransferLineBinAllocation } from "../../sap/purchase-builder";
import moment = require("moment");
import userManagement, { UserProperty } from "../../user-management";
import { config } from "../../config";
import * as fs from "fs";
import UserRepresentation from "keycloak-admin/lib/defs/userRepresentation";

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

    const amount = payload.amount;
    if (!amount) {
      this.sendBadRequest(res, "Missing required body param amount");
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

    if (status === "DONE" && !deliveryQuality) {
      this.sendBadRequest(res, "Missing qualityId");
      return;  
    }

    let databaseDelivery = null;

    if (status === "DONE" && deliveryQuality) {
      const product: ProductModel = await models.findProductById(productId);
      if (!product || !product.id) {
        this.sendInternalServerError(res, "Failed to resolve product");
        return;
      }
      
      const productPrice = await this.getCurrentProductPrice(product.id);
      if (!productPrice) {
        this.sendInternalServerError(res, "Failed to resolve price");
        return;
      }

      const unitPrice = parseFloat(productPrice);
      const unitPriceWithBonus = unitPrice + deliveryQuality.priceBonus;

      if (!unitPrice || !unitPriceWithBonus) {
        this.sendInternalServerError(res, "Failed to resolve price");
        return;
      }

      const receivingUserId = this.getLoggedUserId(req);
      const deliveryContact: UserRepresentation | null = await userManagement.findUser(delivery.userId);
      if (!deliveryContact) {
        this.sendInternalServerError(res, "Failed to deliveryContact");
        return;
      }

      const receivingContact: UserRepresentation | null = await userManagement.findUser(receivingUserId);
      if (!receivingContact) {
        this.sendInternalServerError(res, "Failed to receivingContact");
        return;
      }

      const deliveryContactSapId = userManagement.getSingleAttribute(deliveryContact, UserProperty.SAP_ID);
      const sapSalesPersonCode = userManagement.getSingleAttribute(receivingContact, UserProperty.SAP_SALES_PERSON_CODE);
 
      if (!deliveryContactSapId) {
        this.sendBadRequest(res, `Missing sapId on delivering user ${deliveryContact.id}`);
        return;  
      }

      if (!sapSalesPersonCode) {
        this.sendBadRequest(res, `Missing sapId on receiving user ${receivingContact.id}`);
        return;  
      }

      await models.updateDelivery(deliveryId, productId, userId, time, status, amount, unitPrice, unitPriceWithBonus, qualityId, databaseDeliveryPlace.id);
      databaseDelivery = await models.findDeliveryById(deliveryId);
      await this.buildPurchaseXML(databaseDelivery, product, databaseDeliveryPlace, unitPrice, unitPriceWithBonus, deliveryContactSapId, sapSalesPersonCode, payload.loans || []);
    } else {
      await models.updateDelivery(deliveryId, productId, userId, time, status, amount, null, null, qualityId, databaseDeliveryPlace.id);
      databaseDelivery = await models.findDeliveryById(deliveryId);
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
   * @param product product
   * @param deliveryPlace delivery place
   * @param price total price of delivery
   * @param unitPrice unit price for single sale unit
   * @param deliveryContactSapId CardCode of the Supplier
   * @param sapSalesPersonCode Receiving person code
   * @param loans
   * @return promise for success
   */
  private async buildPurchaseXML(delivery: DeliveryModel, product: ProductModel, deliveryPlace: DeliveryPlaceModel, unitPrice: number, unitPriceWithBonus: number, deliveryContactSapId: string, sapSalesPersonCode: string, loans: DeliveryLoan[]) {
    const builder = new PurchaseMessageBuilder();

    const date: string = moment(delivery.time).format("YYYYMMDD");
    const notes = await this.getNotesString(delivery.id);
    const sapItemCode = product.sapItemCode;
    const warehouseCode = deliveryPlace.sapId;
    const loanWarehouse = "100";

    builder.setPurchaseReceiptHeader({
      DocDate: date,
      CardCode: deliveryContactSapId,
      Comments: notes,
      WarehouseCode: warehouseCode,
      SalesPersonCode: sapSalesPersonCode,
    });

    builder.addPurchaseReceiptLine({
      ItemCode: sapItemCode,
      Quantity: delivery.amount,
      Price: unitPriceWithBonus,
      UnitPrice: unitPrice,
      WarehouseCode: warehouseCode,
      U_PFZ_REF: this.compressUUID(delivery.id!)
    });

    builder.setTransferHeader({
      CardCode: deliveryContactSapId,
      DocDate: date,
      Comments: notes,
      WarehouseCode: loanWarehouse,
      FromWarehouseCode: loanWarehouse,
      SalesPersonCode: sapSalesPersonCode,
    });

    loans.forEach((loan) => {
      const itemCode: string = config().sap.loanProductIds[loan.item];
      const binAllocations: TransferLineBinAllocation[] = [];

      if (loan.returned > 0) {
        binAllocations.push({
          BinAbsEntry: 2,
          Quantity: loan.returned,
          BinActionType: "batToWarehouse"
        });
      }

      if (loan.loaned > 0) {
        binAllocations.push({
          BinAbsEntry: 3,
          Quantity: loan.loaned,
          BinActionType: "batFromWarehouse"
        });
      }

      const line: TransferLine = {
        ItemCode: itemCode,
        BinAllocations: binAllocations
      };

      builder.addTransferLine(line);
    });

    const xml = builder.buildXML();
    const filePath = `${config().sap["xml-fileupload-path"]}/${delivery.id ? delivery.id : Date.now().toString()}.xml`;

    return new Promise((resolve, reject) => {
      fs.writeFile(filePath, xml, (err: any) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Compresses uuid by stripping minus signs from the string
   * 
   * @param uuid uuid
   * @returns compressed uuid
   */
  private compressUUID(uuid: string): string {
    return uuid.replace(/\-/g, '');
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
      "price": delivery.unitPriceWithBonus ? (delivery.unitPriceWithBonus * delivery.amount).toFixed(3) : null,
      "qualityId": delivery.qualityId,
      "deliveryPlaceId": deliveryPlace.externalId,
      "loans": []
    };

    return result;
  }

  /**
   * Returns current price for a product
   * 
   * @param productId product id
   * @return product price or null if not found
   */
  private async getCurrentProductPrice(productId: string): Promise<string | null> {
    const price = await models.findLatestProductPrice(productId);
    if (!price) {
      return null;
    }

    return price.price;
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