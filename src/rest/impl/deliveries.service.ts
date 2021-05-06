import { Application, Response, Request } from "express";
import * as Keycloak from "keycloak-connect";
import models, { DeliveryModel, DeliveryNoteModel, ProductModel, DeliveryPlaceModel } from "../../models";
import DeliveriesService from "../api/deliveries.service";
import { Delivery, DeliveryNote, DeliveryLoan, ItemGroupCategory } from "../model/models";
import ApplicationRoles from "../application-roles";
import * as uuid from "uuid/v4";
import moment = require("moment");
import userManagement, { UserProperty } from "../../user-management";
import { config } from "../../config";
import UserRepresentation from "keycloak-admin/lib/defs/userRepresentation";
import * as _ from "lodash";
import mailer from "../../mailer";
import { BinActionTypeEnum, SapDocObjectCodeEnum, SapPurchaseDeliveryNote, SapStockTransfer, SapStockTransferLine } from "../../sap/service-layer-client/types";
import SapServiceFactory from "../../sap/service-layer-client";
import { getLogger } from "log4js";
import { createStackedReject, logReject } from "../../utils";

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
      if (!product || !product.id) {
        this.sendInternalServerError(res, "Failed to resolve product");
        return;
      }
      
      const productPrice = await this.getProductPriceAtTime(product.id, time);
      if (!productPrice) {
        this.sendInternalServerError(res, "Failed to resolve product price");
        return;
      }

      const itemGroup = await models.findItemGroupById(product.itemGroupId);

      const unitPrice = parseFloat(productPrice);
      let unitPriceWithBonus = 0;

      if(amount > 0){
        const bonusPrice = amount * product.units * product.unitSize * deliveryQuality.priceBonus;
        const totalPrice = unitPrice * amount + bonusPrice;
        unitPriceWithBonus = totalPrice / amount;
      }

      if (unitPrice < 0 || unitPriceWithBonus < 0) {
        this.sendInternalServerError(res, "Failed to resolve price");
        return;
      }

      const receivingUserId = this.getLoggedUserId(req);
      const deliveryContact: UserRepresentation | null = await userManagement.findUser(req.body.userId);
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

      const databaseDelivery = await models.createDelivery(uuid(), productId, userId, time, status, amount, price, unitPrice, unitPriceWithBonus, qualityId, databaseDeliveryPlace.id);

      try {
        await this.createDeliveryDocumentsToSap(databaseDelivery, product, databaseDeliveryPlace, unitPriceWithBonus, deliveryContactSapId, sapSalesPersonCode, req.body.loans || [], itemGroup.category);
      } catch (e) {
        logReject(e, getLogger());
      }
      res.status(200).send(await this.translateDatabaseDelivery(databaseDelivery));
    } else {
      const result = await models.createDelivery(uuid(), productId, userId, time, status, amount, price, null, null, qualityId, databaseDeliveryPlace.id);
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

    const amount = payload.amount;

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
      
      const productPrice = await this.getProductPriceAtTime(product.id, time);
      if (!productPrice) {
        this.sendInternalServerError(res, "Failed to resolve product price");
        return;
      }

      const itemGroup = await models.findItemGroupById(product.itemGroupId);

      const unitPrice = parseFloat(productPrice);
      let unitPriceWithBonus = 0;

      if(amount > 0){
        const bonusPrice = amount * product.units * product.unitSize * deliveryQuality.priceBonus;
        const totalPrice = unitPrice * amount + bonusPrice;
        unitPriceWithBonus = totalPrice / amount;
      }

      if (unitPrice < 0 || unitPriceWithBonus < 0) {
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
      try {
        await this.createDeliveryDocumentsToSap(databaseDelivery, product, databaseDeliveryPlace, unitPriceWithBonus, deliveryContactSapId, sapSalesPersonCode, payload.loans || [], itemGroup.category);
      } catch (e) {
        logReject(e, getLogger());
      }
    } else {
      await models.updateDelivery(deliveryId, productId, userId, time, status, amount, null, null, qualityId, databaseDeliveryPlace.id);
      databaseDelivery = await models.findDeliveryById(deliveryId);

      if (databaseDelivery.status === "REJECTED" || databaseDelivery.status === "NOT_ACCEPTED") {
        const deliveryContact: UserRepresentation | null = await userManagement.findUser(delivery.userId);
        const deliveryPlace = await models.findDeliveryPlaceById(delivery.deliveryPlaceId);

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

        const additionalInfotoShipper: string[] = category === "FRESH" ? [
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
        const contentsToShipper = `Vastaanottaja on hylännyt toimituksen, jonka ajankohta oli ${moment(databaseDelivery.time).format("DD.MM.YYYY")} klo ${moment(databaseDelivery.time).format("HH.mm")}.${latestDeliveryNote ? `\n\n${additionalRejectionInfo}` : ""}\n\nToimituksen tiedot:\n\n${deliveryInfoToShipper.join("\n")}\n\nLisätietoja:\n${additionalInfotoShipper.join("\n")}\n\n--------------------------------------------------\nTämä on automaattinen sähköposti. Älä vastaa tähän\n--------------------------------------------------`;

        /**Email data for recipient */
        const subjectToRecipient = `Ilmoitus toimituksen hylkäyksestä lähetetty`;
        const contentsToRecipient = `Ilmoitus lähetetty toimittajalle toimituksen hylkäyksestä.${latestDeliveryNote ? `\n\n${additionalRejectionInfo}` : ""}\n\nToimituksen tiedot:\n\n${deliveryInfoToRecipient.join("\n")}\n--------------------------------------------------\nTämä on automaattinen sähköposti. Älä vastaa tähän\n--------------------------------------------------`;

        if (
          contactConfig &&
          contactConfig.notifications &&
          contactConfig.notifications.fresh &&
          contactConfig.notifications.frozen &&
          contactConfig.notifications.deliveries
        ) {
          const recipientEmail = category == "FRESH" ? [contactConfig.notifications.fresh] : [contactConfig.notifications.frozen, contactConfig.notifications.deliveries];
          const shipperEmail = deliveryContact.email;

          recipientEmail.forEach(recipientEmail => {
            mailer.send(sender, recipientEmail, subjectToRecipient, contentsToRecipient);
          });

          if (shipperEmail) {
            mailer.send(sender, shipperEmail, subjectToShipper, contentsToShipper, imageAttachment);
          }
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
   * Create delivery documents to SAP
   * 
   * @param delivery delivery
   * @param product product
   * @param deliveryPlace delivery place
   * @param unitPriceWithBonus unit price with bonus
   * @param deliveryContactSapId CardCode of the Supplier
   * @param sapSalesPersonCode Receiving person code
   * @param loans loans
   * @param itemGroupCategory item group category
   * @return promise of successful creation
   */
  private async createDeliveryDocumentsToSap(
    delivery: DeliveryModel,
    product: ProductModel,
    deliveryPlace: DeliveryPlaceModel,
    unitPriceWithBonus: number,
    deliveryContactSapId: string,
    sapSalesPersonCode: string,
    loans: DeliveryLoan[],
    itemGroupCategory: string
  ): Promise<void> {
    const date: string = moment(delivery.time).format("YYYY-MM-DD");
    const notes = await this.getNotesString(delivery.id);
    const sapItemCode = product.sapItemCode;
    const salesPersonCode = parseInt(sapSalesPersonCode, 10);
    const loanWarehouse = "100";
    const warehouseCode = deliveryPlace.sapId == "01" && itemGroupCategory == "FRESH" ? "02" : deliveryPlace.sapId;

    const purchaseDeliveryNote: SapPurchaseDeliveryNote = {
      DocObjectCode: SapDocObjectCodeEnum.PURCHASE_DELIVERY_NOTE,
      DocDate: date,
      CardCode: deliveryContactSapId,
      Comments: notes,
      SalesPersonCode: salesPersonCode,
      DocumentLines: [{
        ItemCode: sapItemCode,
        Quantity: delivery.amount,
        UnitPrice: unitPriceWithBonus,
        WarehouseCode: warehouseCode,
        U_PFZ_REF: this.compressUUID(delivery.id!)
      }]
    };

    const stockTransferLines: SapStockTransferLine[] = [];
    loans.forEach(loan => {
      const itemCode = config().sap.loanProductIds[loan.item];

      const stockTransferLine: SapStockTransferLine = {
        ItemCode: itemCode,
        Quantity: null,
        FromWarehouseCode: loanWarehouse,
        WarehouseCode: loanWarehouse,
        StockTransferLinesBinAllocations: []
      };

      if (loan.returned > 0) {
        stockTransferLines.push({
          ...stockTransferLine,
          Quantity: loan.returned,
          StockTransferLinesBinAllocations: [
            {
              BinAbsEntry: 2,
              Quantity: loan.returned,
              BinActionType: BinActionTypeEnum.TO_WAREHOUSE,
            },
            {
              BinAbsEntry: 3,
              Quantity: loan.returned,
              BinActionType: BinActionTypeEnum.FROM_WAREHOUSE
            },
          ]
        });
      }

      if (loan.loaned > 0) {
        stockTransferLines.push({
          ...stockTransferLine,
          Quantity: loan.loaned,
          StockTransferLinesBinAllocations: [
            {
              BinAbsEntry: 3,
              Quantity: loan.loaned,
              BinActionType: BinActionTypeEnum.TO_WAREHOUSE
            },
            {
              BinAbsEntry: 2,
              Quantity: loan.loaned,
              BinActionType: BinActionTypeEnum.FROM_WAREHOUSE
            },
          ]
        });
      }
    });

    const stockTransfer: SapStockTransfer = {
      DocDate: date,
      CardCode: deliveryContactSapId,
      Comments: notes,
      SalesPersonCode: salesPersonCode,
      FromWarehouse: loanWarehouse,
      ToWarehouse: loanWarehouse,
      StockTransferLines: stockTransferLines
    };

    try {
      const sapPurchaseDeliveryNotesService = SapServiceFactory.getPurchaseDeliveryNotesService();
      const sapStockTransfersService = SapServiceFactory.getStockTransfersService();
      await sapPurchaseDeliveryNotesService.createPurchaseDeliveryNote(purchaseDeliveryNote);
      await sapStockTransfersService.createStockTransfer(stockTransfer);
    } catch (e) {
      return Promise.reject(createStackedReject("Failed to create delivery documents to SAP", e));
    }
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
      "price": delivery.unitPriceWithBonus ? delivery.unitPriceWithBonus.toFixed(2) : null,
      "qualityId": delivery.qualityId,
      "deliveryPlaceId": deliveryPlace.externalId,
      "warehouseCode": delivery.warehouseCode,
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
   * Returns current price for a product
   * 
   * @param productId product id
   * @return product price or null if not found
   */
  private async getProductPriceAtTime(productId: string, date: Date): Promise<string | null> {
    const price = await models.findProductPriceAtTime(productId, date);
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

    const notesJoined = notes.join(" ; ");

    return _.truncate(notesJoined, { "length": 253 });
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