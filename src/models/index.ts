import * as Bluebird from "bluebird";
import * as Sequelize from "sequelize";
import * as _ from "lodash";
import { DeliveryStatus, ItemGroupCategory } from "../rest/model/models";

export interface SessionModel {
  id: string,
  userId: string,
  createdAt: Date,
  updatedAt: Date
}

export interface ConnectSessionModel {
  sid: string,
  userId: string,
  expires: Date,
  data: string,
  createdAt: Date,
  updatedAt: Date
}

export interface UserSettingsModel {
  id: number,
  userId: string,
  settingKey: string,
  settingValue: string,
  createdAt: Date,
  updatedAt: Date
}

export interface ChatGroupModel {
  id: number,
  type: string,
  title: string,
  imageUrl: string,
  archived: boolean,
  createdAt: Date,
  updatedAt: Date
}

export interface ThreadModel {
  id: number,
  title: string,
  description: string,
  type: string,
  ownerId?: string,
  groupId: number,
  imageUrl: string,
  archived: boolean,
  answerType: string,
  pollAllowOther: boolean,
  expiresAt?: Date,
  createdAt: Date,
  updatedAt: Date
}

export interface ThreadPredefinedTextModel {
  id: number,
  threadId: number,
  text: string,
  createdAt: Date,
  updatedAt: Date
}

export interface MessageModel {
  id: number,
  threadId: number,
  userId: string,
  contents?: string,
  image?: string,
  createdAt: Date,
  updatedAt: Date
}

export interface NewsArticleModel {
  id: number,
  title: string,
  contents: string,
  imageUrl: string,
  createdAt: Date,
  updatedAt: Date
}

export interface ItemReadModel {
  id: number,
  userId: string,
  itemId: string,
  createdAt: Date,
  updatedAt: Date
}

export interface ItemGroupModel {
  id: number,
  sapId: string,
  externalId: string,
  name: string,
  category: string,
  displayName?: string,
  minimumProfitEstimation: number,
  prerequisiteContractItemGroupId?: number,
  createdAt: Date,
  updatedAt: Date
}

export interface ItemGroupPriceModel {
  id: number,
  externalId: string,
  groupName: string,
  unit: string,
  price: string,
  year: number,
  itemGroupId: number,
  createdAt: Date,
  updatedAt: Date
}

export interface DeliveryPlaceModel {
  id: number,
  sapId: string,
  externalId: string,
  name: string,
  createdAt: Date,
  updatedAt: Date
}

export interface ContractModel {
  id: number,
  externalId: string,
  userId: string,
  itemGroupId: number,
  deliveryPlaceId: number,
  proposedDeliveryPlaceId: number,
  sapId?: string,
  contractQuantity: number,
  deliveredQuantity: number,
  proposedQuantity: number,
  year: number,
  startDate: Date,
  endDate: Date,
  signDate: Date,
  termDate: Date,
  status: string,
  areaDetails: string,
  deliverAll: boolean,
  proposedDeliverAll: boolean,
  remarks: string,
  deliveryPlaceComment: string,
  quantityComment: string,
  rejectComment: string,
  createdAt: Date,
  updatedAt: Date
}

export interface DocumentTemplateModel {
  id: number,
  contents: string,
  header?: string,
  footer?: string,
  createdAt: Date,
  updatedAt: Date
}

export interface ItemGroupDocumentTemplateModel {
  id: number,
  externalId: string,
  type: string,
  itemGroupId: number,
  documentTemplateId: number,
  createdAt: Date,
  updatedAt: Date
}

export interface ContractDocumentTemplateModel {
  id: number,
  externalId: string,
  type: string,
  contractId: number,
  documentTemplateId: number,
  createdAt: Date,
  updatedAt: Date
}

export interface ContractDocumentModel {
  id: number,
  type: string,
  contractId: number,
  vismaSignDocumentId: string,
  signed: boolean,
  createdAt: Date,
  updatedAt: Date
}

export interface OperationReportModel {
  id: number,
  externalId: string,
  type: string,
  createdAt: Date,
  updatedAt: Date
}

export interface OperationReportItemModel {
  id: number,
  message?: string,
  operationReportId: number,
  completed: boolean,
  success: boolean,
  createdAt: Date,
  updatedAt: Date
}

/**
 * Interface for week delivery prediction
 */
export interface WeekDeliveryPredictionModel { 
  id: string | null;
  itemGroupId: number;
  userId: string;
  amount: number;
  weekNumber: number;
  year: number;
  days: number;
}

/**
 * Interface for product
 */
export interface ProductModel { 
  id: string | null;
  itemGroupId: number;
  name: string;
  units: number;
  unitSize: number;
  unitName: string;
  sapItemCode: string,
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface for delivery
 */
export interface DeliveryModel { 
  id: string | null;
  productId: string;
  userId: string;
  time: Date;
  status: DeliveryStatus;
  amount: number;
  unitPrice: number | null;
  unitPriceWithBonus: number | null;
  qualityId: string | null;
  deliveryPlaceId: number;
  warehouseCode: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface for delivery note
 */
export interface DeliveryNoteModel { 
  id: string | null;
  deliveryId: string;
  text: string | null;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface for public file
 */
export interface PublicFileModel { 
  id: string | null;
  url: string
}

/**
 * Interface for product price
 */
export interface ProductPriceModel {
  id: string | null;
  productId: string;
  unit: string;
  price: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface for delivery quality
 */
export interface DeliveryQualityModel {
  id: string | null;
  itemGroupCategory: string;
  name: string;
  priceBonus: number;
  color: string;
}

/**
 * Interface for unread
 */
export interface UnreadModel { 
  id: string | null;
  path: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface for unread
 */
export interface DataSheetModel { 
  id: string | null;
  name: string;
  data: string;
  createdAt: Date;
  updatedAt: Date;
}

const PRINT_MODEL_INTERFACES = false;

export class Models { 

  private sequelize: Sequelize.Sequelize;
  private Thread: Sequelize.Model<any, ThreadModel>;
  private ChatGroup: Sequelize.Model<any, ChatGroupModel>;
  private Message: Sequelize.Model<any, MessageModel>;
  private WeekDeliveryPrediction: Sequelize.Model<any, WeekDeliveryPredictionModel>;
  private Product: Sequelize.Model<any, ProductModel>;
  private Delivery: Sequelize.Model<any, DeliveryModel>;
  private DeliveryNote: Sequelize.Model<any, DeliveryNoteModel>;
  private PublicFile: Sequelize.Model<any, PublicFileModel>;
  private ProductPrice: Sequelize.Model<any, ProductPriceModel>;
  private DeliveryQuality: Sequelize.Model<any, DeliveryQualityModel>;
  private Unread: Sequelize.Model<any, UnreadModel>;
  private DataSheet: Sequelize.Model<any, DataSheetModel>;

  public init(sequelize: Sequelize.Sequelize) {
    this.sequelize = sequelize;
    this.defineModels();
  }

  /**
   * Defines database models
   */
  private defineModels() {
    this.defineModel("Session", {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false, defaultValue: Sequelize.UUIDV4 },
      userId: { type: Sequelize.STRING(191), allowNull: false, validate: { isUUID: 4 } }
    });
    
    this.defineModel("ConnectSession", {
      sid: { type: Sequelize.STRING(191), primaryKey: true },
      userId: { type: Sequelize.STRING(191) },
      expires: { type: Sequelize.DATE },
      data: { type: Sequelize.TEXT }
    });
    
    this.defineModel("UserSettings", {
      id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
      userId: { type: Sequelize.STRING(191), allowNull: false, validate: { isUUID: 4 } },
      settingKey: { type: Sequelize.STRING(191), allowNull: false },
      settingValue: { type: Sequelize.STRING(191) }
    }, {
      indexes: [{
        name: "UN_USERSETTING_USERID_SETTINGKEY",
        unique: true,
        fields: ["userId", "settingKey"]
      }]
    });
    
    this.ChatGroup = this.defineModel("ChatGroup", {
      id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
      type: { type: Sequelize.STRING(191), allowNull: false },
      title: { type: Sequelize.STRING(191), allowNull: false },
      imageUrl: { type: Sequelize.STRING(191) },
      archived: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false}
    });
    
    this.Thread = this.defineModel("Thread", {
      id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
      title: { type: Sequelize.STRING(191) },
      description: { type: "LONGTEXT" },
      type: { type: Sequelize.STRING(191), allowNull: false },
      ownerId: { type: Sequelize.STRING(191), allowNull: true },
      groupId: { type: Sequelize.BIGINT, allowNull: false, references: { model: this.sequelize.models.ChatGroup, key: "id" } },
      imageUrl: { type: Sequelize.STRING(191) },
      archived: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false},
      answerType: { type: Sequelize.STRING(191), allowNull: false, defaultValue: "TEXT" },
      pollAllowOther: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      expiresAt: { type: Sequelize.DATE, allowNull: true }
    });

    this.defineModel("ThreadPredefinedText", {
      id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
      threadId: { type: Sequelize.BIGINT, allowNull: false, references: { model: this.sequelize.models.Thread, key: "id" } },
      text: { type: Sequelize.STRING(191), allowNull: false }
    });
    
    this.Message = this.defineModel("Message", {
      id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
      threadId: { type: Sequelize.BIGINT, allowNull: false, references: { model: this.sequelize.models.Thread, key: "id" } },
      userId: { type: Sequelize.STRING(191), allowNull: false, validate: { isUUID: 4 } },
      contents: { type: Sequelize.TEXT, allowNull: true },
      image: { type: Sequelize.TEXT, allowNull: true }
    });
    
    this.defineModel("NewsArticle", {
      id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
      title: { type: Sequelize.STRING(191), allowNull: false },
      contents: { type: "LONGTEXT", allowNull: false },
      imageUrl: { type: Sequelize.STRING(191), validate: { isUrl: true } }
    });
    
    this.defineModel("ItemRead", {
      id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
      userId: { type: Sequelize.STRING(191), allowNull: false, validate: { isUUID: 4 } },
      itemId: { type: Sequelize.STRING(191), allowNull: false }
    }, {
      indexes: [{
        name: "UN_ITEMREAD_USERID_ITEMID",
        unique: true,
        fields: ["userId", "itemId"]
      }]
    });
    
    this.defineModel("ItemGroup", {
      id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
      sapId: { type: Sequelize.STRING(191), allowNull: true },
      externalId: { type: Sequelize.UUID, allowNull: false, validate: { isUUID: 4 }, defaultValue: Sequelize.UUIDV4 },
      name: { type: Sequelize.STRING(191), allowNull: false },
      category: { type: Sequelize.STRING(191), allowNull: false },
      displayName: { type: Sequelize.STRING(191), allowNull: true },
      minimumProfitEstimation: { type: Sequelize.DOUBLE, allowNull: false, defaultValue: 0 },
      prerequisiteContractItemGroupId: { type: Sequelize.BIGINT, allowNull: true, references: { model: this.sequelize.models.ItemGroup, key: "id" } }
    }, {
      indexes: [{
        name: "UN_ITEMGROUP_SAP_ID",
        unique: true,
        fields: ["sapId"]
      }, {
        name: "UN_ITEMGROUP_EXTERNAL_ID",
        unique: true,
        fields: ["externalId"]
      }]
    });

    this.defineModel("ItemGroupPrice", {
      id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
      externalId: { type: Sequelize.UUID, unique: true, validate: { isUUID: 4 }, defaultValue: Sequelize.UUIDV4 },
      groupName: { type: Sequelize.STRING(191), allowNull: false },
      unit: { type: Sequelize.STRING(191), allowNull: false },
      price: { type: Sequelize.STRING(191), allowNull: false },
      year: { type: Sequelize.INTEGER, allowNull: false },
      itemGroupId: { type: Sequelize.BIGINT, allowNull: false, references: { model: this.sequelize.models.ItemGroup, key: "id" } }
    });

    this.defineModel("DeliveryPlace", {
      id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
      sapId: { type: Sequelize.STRING(191), allowNull: false },
      externalId: { type: Sequelize.UUID, allowNull: false, validate: { isUUID: 4 }, defaultValue: Sequelize.UUIDV4 },
      name: { type: Sequelize.STRING(191), allowNull: false }
    }, {
      indexes: [{
        name: "UN_DELIVERY_PLACE_SAP_ID",
        unique: true,
        fields: ["sapId"]
      }, {
        name: "UN_DELIVERY_PLACE_EXTERNAL_ID",
        unique: true,
        fields: ["externalId"]
      }]
    });
    
    this.defineModel("Contract", {
      id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
      externalId: { type: Sequelize.UUID, validate: { isUUID: 4 }, defaultValue: Sequelize.UUIDV4 },
      userId: { type: Sequelize.STRING(191), allowNull: false, validate: { isUUID: 4 } },
      itemGroupId: { type: Sequelize.BIGINT, allowNull: false, references: { model: this.sequelize.models.ItemGroup, key: "id" } },
      deliveryPlaceId: { type: Sequelize.BIGINT, allowNull: false, references: { model: this.sequelize.models.DeliveryPlace, key: "id" } },
      proposedDeliveryPlaceId: { type: Sequelize.BIGINT, allowNull: false, references: { model: this.sequelize.models.DeliveryPlace, key: "id" } },
      sapId: { type: Sequelize.STRING(191), allowNull: true },
      contractQuantity: { type: Sequelize.BIGINT },
      deliveredQuantity: { type: Sequelize.BIGINT },
      proposedQuantity: { type: Sequelize.BIGINT },
      year: { type: Sequelize.INTEGER, allowNull: false },
      startDate: { type: Sequelize.DATE },
      endDate: { type: Sequelize.DATE },
      signDate: { type: Sequelize.DATE },
      termDate: { type: Sequelize.DATE },
      status: { type: Sequelize.STRING(191), allowNull: false },
      areaDetails: { type: "LONGTEXT" },
      deliverAll: { type: Sequelize.BOOLEAN, allowNull: false },
      proposedDeliverAll: { type: Sequelize.BOOLEAN, allowNull: false },
      remarks: { type: Sequelize.TEXT },
      deliveryPlaceComment: { type: Sequelize.TEXT  },
      quantityComment: { type: Sequelize.TEXT  },
      rejectComment: { type: Sequelize.TEXT }
    }, {
      indexes: [{
        name: "UN_CONTRACT_EXTERNAL_ID",
        unique: true,
        fields: ["externalId"]
      }, {
        name: "UN_CONTRACT_SAP_ID",
        unique: true,
        fields: ["sapId"]
      }]
    });
    
    this.defineModel("DocumentTemplate", {
      id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
      contents: { type: "LONGTEXT", allowNull: false },
      header: { type: "LONGTEXT", allowNull: true },
      footer: { type: "LONGTEXT", allowNull: true }
    });

    this.defineModel("ItemGroupDocumentTemplate", {
      id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
      externalId: { type: Sequelize.UUID, validate: { isUUID: 4 }, defaultValue: Sequelize.UUIDV4 },
      type: { type: Sequelize.STRING(191), allowNull: false },
      itemGroupId: { type: Sequelize.BIGINT, allowNull: false, references: { model: this.sequelize.models.ItemGroup, key: "id" } },
      documentTemplateId: { type: Sequelize.BIGINT, allowNull: false, references: { model: this.sequelize.models.DocumentTemplate, key: "id" } }
    }, {
      indexes: [{
        name: "UN_ITEM_GROUP_TEMPLATE_EXTERNAL_ID",
        unique: true,
        fields: ["externalId"]
      }, {
        name: "UN_ITEM_GROUP_TEMPLATE_ITEM_GROUP_ID_TYPE",
        unique: true,
        fields: ["type", "itemGroupId"]
      }]
    });
    
    this.defineModel("ContractDocumentTemplate", {
      id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
      externalId: { type: Sequelize.UUID, validate: { isUUID: 4 }, defaultValue: Sequelize.UUIDV4 },
      type: { type: Sequelize.STRING(191), allowNull: false },
      contractId: { type: Sequelize.BIGINT, allowNull: false, references: { model: this.sequelize.models.Contract, key: "id" } },
      documentTemplateId: { type: Sequelize.BIGINT, allowNull: false, references: { model: this.sequelize.models.DocumentTemplate, key: "id" } }
    }, {
      indexes: [{
        name: "UN_CONTRACT_DOCUMENT_TEMPLATE_EXTERNAL_ID",
        unique: true,
        fields: ["externalId"]
      }, {
        name: "UN_CONTRACT_DOCUMENT_TEMPLATE_CONTRACT_ID_TYPE",
        unique: true,
        fields: ["type", "contractId"]
      }]
    });

    this.defineModel("ContractDocument", {
      id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
      type: { type: Sequelize.STRING(191), allowNull: false },
      contractId: { type: Sequelize.BIGINT, allowNull: false, references: { model: this.sequelize.models.Contract, key: "id" } },
      vismaSignDocumentId: { type: Sequelize.STRING(191), allowNull: false },
      signed: { type: Sequelize.BOOLEAN, allowNull: false }
    }, {
      indexes: [{
        name: "UN_CONTRACT_DOCUMENT_CONTRACT_ID_TYPE",
        unique: true,
        fields: ["type", "contractId"]
      }]
    });
    
    this.defineModel("OperationReport", {
      id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
      externalId: { type: Sequelize.UUID, unique: true, validate: { isUUID: 4 }, defaultValue: Sequelize.UUIDV4 },
      type: { type: Sequelize.STRING(191), allowNull: false }
    });
    
    this.defineModel("OperationReportItem", {
      id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
      message: { type: "LONGBLOB", allowNull: true },
      operationReportId: { type: Sequelize.BIGINT, allowNull: false, references: { model: this.sequelize.models.OperationReport, key: "id" } },
      completed: { type: Sequelize.BOOLEAN, allowNull: false },
      success: { type: Sequelize.BOOLEAN, allowNull: false }
    });

    this.WeekDeliveryPrediction = this.defineModel("WeekDeliveryPrediction", {
      id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
      itemGroupId: { type: Sequelize.BIGINT, allowNull: false, references: { model: this.sequelize.models.ItemGroup, key: "id" } },
      userId: { type: Sequelize.STRING(191), allowNull: false },
      amount: { type: Sequelize.BIGINT, allowNull: false },
      weekNumber: { type: Sequelize.INTEGER, allowNull: false },
      year: { type: Sequelize.INTEGER, allowNull: false },
      days: { type: Sequelize.TINYINT, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    this.Product = this.defineModel("Product", {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false, validate: { isUUID: 4 } },
      itemGroupId: { type: Sequelize.BIGINT, allowNull: false, references: { model: "ItemGroups", key: "id" } },
      name: { type: Sequelize.STRING(191), allowNull: false },
      units: { type: Sequelize.INTEGER, allowNull: false },
      unitSize: { type: Sequelize.INTEGER, allowNull: false },
      unitName: { type: Sequelize.STRING(191), allowNull: false },
      sapItemCode: { type: Sequelize.STRING(191), allowNull: false }
    });

    this.Delivery = this.defineModel("Delivery", {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false, validate: { isUUID: 4 } },
      productId: { type: Sequelize.UUID, allowNull: false, references: { model: "Products", key: "id" } },
      userId: { type: Sequelize.UUID, allowNull: false },
      time: { type: Sequelize.DATE, allowNull: false },
      status: { type: Sequelize.STRING(191), allowNull: false },
      amount: { type: Sequelize.INTEGER, allowNull: false },
      unitPrice: { type: Sequelize.DOUBLE, allowNull: true },
      unitPriceWithBonus: { type: Sequelize.DOUBLE, allowNull: true },
      qualityId: { type: Sequelize.UUID, allowNull: true },
      deliveryPlaceId: { type: Sequelize.BIGINT, allowNull: false, references: { model: "DeliveryPlaces", key: "id" } },
      warehouseCode: { type: Sequelize.STRING(191), allowNull: true }
    });

    this.DeliveryNote = this.defineModel("DeliveryNote", {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false, validate: { isUUID: 4 } },
      deliveryId: { type: Sequelize.UUID, allowNull: false },
      text: { type: Sequelize.TEXT, allowNull: true },
      image: { type: Sequelize.STRING(191), allowNull: true },
    });
    
    this.PublicFile = this.defineModel("PublicFile", {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false, validate: { isUUID: 4 } },
      url: { type: Sequelize.STRING(191), allowNull: false }
    });

    this.ProductPrice = this.defineModel("ProductPrice", {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false, validate: { isUUID: 4 } },
      productId: { type: Sequelize.UUID, allowNull: false, references: { model: "Products", key: "id" } },
      unit: { type: Sequelize.STRING(191), allowNull: false },
      price: { type: Sequelize.STRING(191), allowNull: false }
    });

    this.DeliveryQuality = this.defineModel("DeliveryQuality", {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false, validate: { isUUID: 4 } },
      itemGroupCategory: { type: Sequelize.STRING(191), allowNull: false },
      name: { type: Sequelize.STRING(191), allowNull: false },
      priceBonus: { type: Sequelize.DOUBLE, allowNull: false, defaultValue: 0 },
      color: { type: Sequelize.STRING(191), allowNull: false }
    });

    this.Unread = this.defineModel("Unread", {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false, validate: { isUUID: 4 } },
      path: { type: Sequelize.STRING(191), allowNull: false },
      userId: { type: Sequelize.STRING(191), allowNull: false, validate: { isUUID: 4 } }
    });

    this.DataSheet = this.defineModel("DataSheet", {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false, validate: { isUUID: 4 }  },
      name: { type: Sequelize.STRING(191), allowNull: false },
      data: { type: "LONGTEXT", allowNull: false }
    });
    
  }

  /**
   * Defines new database model.
   * 
   * @param {String} name model name
   * @param {Object} attributes model attributes
   * @param {Object} options model options
   */
  private defineModel(name: string, attributes: any, options?: any): Sequelize.Model<any, any> {
    const result = this.sequelize.define(name, attributes, Object.assign(options || {}, {
      charset: "utf8mb4",
      dialectOptions: {
        collate: "utf8mb4_unicode_ci"
      }
    }));

    if (PRINT_MODEL_INTERFACES) {
      this.printModel(name, attributes);
    }

    return result;
  }

  private printModel(name: string, attributes: any) {
    const properties = Object.keys(attributes).map((attributeName: string) => {
      const attribute = attributes[attributeName];
      const attributeType = "" + attribute.type;
      const optional = attribute.allowNull === true;
      let type = "string";

      if (["TEXT", "LONGTEXT", "LONGBLOB", "CHAR(36) BINARY", "VARCHAR(191)"].indexOf(attributeType) != -1) {
        type = "string";
      } else if (["BIGINT", "INTEGER", "DOUBLE PRECISION"].indexOf(attributeType) != -1) {
        type = "number";
      } else if (["TINYINT(1)"].indexOf(attributeType) != -1) {
        type = "boolean";
      } else if (["DATETIME"].indexOf(attributeType) != -1) {
        type = "Date";
      } else {
        type = '"' + attributeType + '" == UNKNOWN!';
      }

      return `  ${attributeName}${optional ? "?" : ""}: ${type}`;
    });

    properties.push(`  createdAt: Date`);
    properties.push(`  updatedAt: Date`);

    console.log(`export interface ${name}Model {\n${properties.join(",\n")}\n}\n`);
  }
  
  // User settings
  
  upsertUserSetting(userId: string, settingKey: string, settingValue: string) {
    return this.sequelize.models.UserSettings.upsert({
      userId: userId,
      settingKey: settingKey,
      settingValue: settingValue
    });
  }
  
  getUserSettings(userId: string) {
    return this.sequelize.models.UserSettings.findAll({ where: { userId: userId } });
  }

  findUserSettingsByUserIdAndKey(userId: string, settingKey: string) {
    return this.sequelize.models.UserSettings.findOne({ where: { userId: userId, settingKey: settingKey } });
  }
  // Sessions
  
  findSession(id: number) {
    return this.sequelize.models.Session.findOne({ where: { id : id } });
  }
  
  createSession(userId: string) {
    return this.sequelize.models.Session.create({
      userId: userId
    });
  }
  
  deleteSession(id: number) {
    return this.sequelize.models.Session.destroy({ where: { id : id } });
  }

  /**
   * Creates new chat group
   * 
   * @param type chat group type
   * @param title chat group title
   * @param imageUrl chat group image url 
   * @returns Promise for created chat group  
   */
  public createChatGroup(type: "CHAT" | "QUESTION", title: string, imageUrl: string | null): PromiseLike<ChatGroupModel> {
    return this.ChatGroup.create({
      type: type,
      title: title,
      imageUrl: imageUrl
    } as any);
  }

  /**
   * Finds single chat group from the database
   * 
   * @param id chat group id
   * @returns Promise for found chat group or null if not found  
   */
  public findChatGroup(id: number): PromiseLike<ChatGroupModel> {
    return this.ChatGroup.findOne({ where: { id : id } });
  }

  /**
   * Lists chat groups
   * 
   * @param type filter by group type
   * @param firstResult first result
   * @param maxResults max results
   * @returns promise for chat groups
   */
  public listChatGroups( type: string | null, firstResult?: number, maxResults?: number): PromiseLike<ChatGroupModel[]> {
    const where: any = {};

    if (type) {
      where.type = type;
    }

    return this.ChatGroup.findAll({ 
      where: where, 
      offset: firstResult,
      limit: maxResults,
      order: [ [ "id", "ASC" ] ]
    });
  }

  /**
   * Updates chat group
   * 
   * @param id thread id 
   * @param title title
   * @param imageUrl image url
   */
  public updateChatGroup(id: number, title: string, type: string, imageUrl: string | null): PromiseLike<[number, any]> {
    return this.ChatGroup.update({
      title: title,
      type: type,
      imageUrl: imageUrl || undefined
    }, {
      where: {
        id: id
      }
    });
  }
  
  /**
   * Deletes chat group
   * 
   * @param id id
   * @return promise for delete
   */
  public deleteChatGroup(id: number): PromiseLike<number> {
    return this.ChatGroup.destroy({ where: { id : id } });
  }

  /**
   * Creates new thread
   * 
   * @param {Number} groupId owner id
   * @param {String} ownerId owner id
   * @param {String} title title
   * @param {String} description description
   * @param {String} type type
   * @param {String} imageUrl image url
   * @param {String} answerType answerType
   * @param {Boolean} pollAllowOther whether polls should allow other answers or not
   * @param {Date} expiresAt expires
   */
  public createThread(groupId: number, ownerId: string | null, title: string|null, description: string|null, type: string, imageUrl: string|null, answerType: string, pollAllowOther: boolean, expiresAt: Date|null): PromiseLike<ThreadModel> {
    return this.Thread.create({
      title: title,
      description: description,
      type: type,
      ownerId: ownerId,
      groupId: groupId,
      imageUrl: imageUrl,
      answerType: answerType,
      pollAllowOther: pollAllowOther,
      expiresAt: expiresAt,
      archived: false
    } as any);
  }
  
  /**
   * Finds single thread from the database
   * 
   * @param id thread id
   * @returns Promise for found thread or null if not found  
   */
  public findThread(id: number): PromiseLike<ThreadModel> {
    return this.Thread.findOne({ where: { id : id } });
  }

  /**
   * Finds single thread by chat group id and owner id 
   * 
   * @param groupId chatGroupId
   * @returns Promise for found thread or null if not found  
   */
  public findThreadByGroupIdAndOwnerId(groupId: number, ownerId: string): PromiseLike<ThreadModel> {
    return this.Thread.findOne({ 
      where: { 
        groupId : groupId, 
        ownerId: ownerId 
      } 
    });
  }

  /**
   * Lists threads
   * 
   * @param groupIds filter by group ids
   * @param ownerId owner id (optional)
   * @param firstResult first result
   * @param maxResults max results
   * @returns promise for threads
   */
  public listThreads(groupIds: number[] | null, ownerId?: string, firstResult?: number, maxResults?: number): PromiseLike<ThreadModel[]> {
    const where: any = {};

    if (groupIds) {
      where.groupId = { [Sequelize.Op.in]: groupIds };
    }

    if (ownerId) {
      where.ownerId = ownerId;
    }

    return this.Thread.findAll({ 
      where: where, 
      offset: firstResult, 
      limit: maxResults,       
      order: [ [ "id", "ASC" ] ]
    });
  }

  /**
   * Updates thread
   * 
   * @param {Number} id thread id 
   * @param {String} ownerId owner id
   * @param {String} title title
   * @param {String} description description
   * @param {String} imageUrl image url
   * @param {Boolean} silentUpdate silent update
   * @param {String} answerType answer type
   * @param {Boolean} pollAllowOther whether polls should allow other answers or not
   * @param {Date} expiresAt expires
   */
  public updateThread(id: number, ownerId: string | null, title: string, description: string | null, imageUrl: string | null, silentUpdate: boolean, answerType: string, pollAllowOther: boolean, expiresAt: Date | null) {
    return this.sequelize.models.Thread.update({
      title: title,
      ownerId: ownerId,
      description: description,
      imageUrl: imageUrl,
      archived: false,
      answerType: answerType,
      pollAllowOther: pollAllowOther,
      expiresAt: expiresAt
    }, {
      where: {
        id: id
      },
      silent: silentUpdate ? silentUpdate : false
    });
  }

  /**
   * Updates thread title
   * 
   * @param id thread id 
   * @param title title
   */
  public updateThreadTitle(id: number, title: string) {
    return this.sequelize.models.Thread.update({
      title: title,
    }, {
      where: {
        id: id
      }
    });
  }

  /**
   * Archives a thread
   * 
   * @param id thread id
   * @return promise for update
   */
  public archiveThread(id: number) {
    return this.Thread.update({ archived: true }, { where: { id: id } });
  }
  /**
   * Deletes a thread
   * 
   * @param id id
   * @return promise for delete
   */
  public deleteThread(id: number) {
    return this.Thread.destroy({ where: { id : id } });
  }
  
  // Messages
  
  /**
   * Creates new chat message
   * 
   * @param threadId thread id
   * @param userId user id
   * @param contents contents
   * @returns created message
   */
  public createMessage(threadId: number, userId: string, contents: string | null, image: string | null): PromiseLike<MessageModel> {
    return this.Message.create({ 
      threadId: threadId,
      userId: userId,
      contents: contents,
      image: image
    } as any);
  }

  /**
   * Finds a chat message
   * 
   * @param id id
   * @returns found message or null if not found
   */
  public findMessage(id: number) {
    return this.Message.findOne({ where: { id : id } });
  }
  
  /**
   * Finds last message posted into a thread by user 
   * 
   * @param {Number} threadId thread id 
   * @param {String} userId contract's user id
   * @return {Object} last message posted into a thread by user or null if not found
   */
  public findLastMessageByThreadIdAndUserId(threadId: number, userId: string): PromiseLike<MessageModel | null> {
    return this.Message.findOne({ 
      where: { 
        threadId: threadId,
        userId: userId 
      }, 
      limit: 1, 
      order: [ [ "createdAt", "DESC" ] ] 
    });
  }

  /**
   * Lists messages by thread id
   * 
   * @param threadId thread id
   * @param firstResult first result
   * @param maxResults max results
   * @return promise for messages
   */
  public listMessagesByThreadId(threadId: number, firstResult?: number, maxResults?: number): PromiseLike<MessageModel[]> {
    if (!threadId) {
      return Bluebird.resolve([]);
    }
    
    return this.sequelize.models.Message.findAll({ where: { threadId : threadId }, offset: firstResult, limit: maxResults, order: [ [ "createdAt", "DESC" ] ] });
  }

  /**
   * Lists messages
   * 
   * @param threadId thread id
   * @param createdBefore created before
   * @param createdAfter created after
   * @param userId user id parameter
   * @param firstResult first result
   * @param maxResults max results
   * @return promise for messages
   */
  public listMessages(threadId: number, createdBefore: Date | null,  createdAfter: Date | null, userId?: string, firstResult?: number, maxResults?: number): PromiseLike<MessageModel[]> {
    if (!threadId) {
      return Bluebird.resolve([]);
    }

    const where: { [key: string]: any } = {
      threadId : threadId
    };

    if (createdAfter && createdBefore) {
      where.createdAt = {
        [Sequelize.Op.between]: [createdAfter, createdBefore]
      };
    } else if (createdAfter) {
      where.createdAt = {
        [Sequelize.Op.gt]: createdAfter
      };
    } else if (createdBefore) {
      where.createdAt = {
        [Sequelize.Op.lt]: createdBefore
      };
    }

    if (userId) {
      where.userId = userId;
    }

    return this.sequelize.models.Message.findAll({ 
      where: where, 
      offset: firstResult, 
      limit: maxResults, 
      order: [ [ "createdAt", "DESC" ] ] });
  }

  /**
   * Updates a message
   * 
   * @param id id
   * @param contents contents 
   * @return promise for update
   */
  public updateMessage(id: number, contents: string | null, image: string | null): PromiseLike<[number, any]> {
    return this.sequelize.models.Message.update({
      contents: contents,
      image: image
    }, {
      where: {
        id: id
      }
    });
  }
  
  /**
   * Returns last message creation date for given set of threads
   * 
   * @param threadIds thread ids
   * @return promise for last message creation date for given set of threads
   */
  public getLatestMessageCreatedByThreadIds(threadIds: number[]) {
    return this.sequelize.models.Message.max("createdAt", { where: { threadId: { $in: threadIds } } });
  }
  
  /**
   * Deletes a message
   * 
   * @param id id
   * @return promise for delete
   */
  public deleteMessage(id: number): PromiseLike<number> {
    return this.sequelize.models.Message.destroy({ where: { id : id } });
  }
  
  // News Articles
  
  /**
   * Creates new article
   * 
   * @param title title 
   * @param contents contents
   * @param imageUrl image URL
   * @returns promise for news article
   */
  createNewsArticle(title: string, contents: string, imageUrl: string | null): PromiseLike<NewsArticleModel> {
    return this.sequelize.models.NewsArticle.create({
      title: title,
      contents: contents,
      imageUrl: imageUrl
    });
  }
  
  /**
   * Finds an new article
   * 
   * @param id news article id
   * @returns promise for news article or null if not found
   */
  findNewsArticleById(id: number): PromiseLike<NewsArticleModel | null> {
    return this.sequelize.models.NewsArticle.findOne({ where: { id : id } });
  }
  
  /**
   * Lists news articles
   * 
   * @param firstResult first result
   * @param maxResults max results
   * @returns promise for news articles
   */
  listNewsArticles(firstResult?: number, maxResults?: number): PromiseLike<NewsArticleModel[]> {
    return this.sequelize.models.NewsArticle.findAll({ offset: firstResult, limit: maxResults });
  }
  
  /**
   * Updates new article
   * 
   * @param id news article id
   * @param title title 
   * @param contents contents
   * @param imageUrl image URL
   * @param silentUpdate silent update
   * @returns promise for update
   */
  updateNewsArticle(id: number, title: string, contents: string, imageUrl: string | null, silentUpdate: boolean): PromiseLike<[number, any]> {
    return this.sequelize.models.NewsArticle.update({
      title: title,
      contents: contents,
      imageUrl: imageUrl
    }, {
      where: {
        id: id
      },
      silent: silentUpdate ? silentUpdate : false
    });
  }
  
  /**
   * Deletes a news article
   * 
   * @param id news article id
   * @returns promise for delete
   */
  deleteNewsArticle(id: number): PromiseLike<number> {
    return this.sequelize.models.NewsArticle.destroy({ where: {id: id} });
  }
  
  // Public files
  
  /**
   * Creates public file
   * 
   * @param url url 
   * @returns promise for public file
   */
  public createPublicFile(id: string, url: string): PromiseLike<PublicFileModel> {
    return this.PublicFile.create({
      id: id,
      url: url
    });
  }
  
  /**
   * Finds a public file
   * 
   * @param id public file id
   * @returns promise for public file or null if not found
   */
  public findPublicFileById(id: number): PromiseLike<PublicFileModel | null> {
    return this.PublicFile.findOne({ where: { id : id } });
  }
  
  /**
   * Lists public files
   * 
   * @param firstResult first result
   * @param maxResults max results
   * @returns promise for public files
   */
  public listPublicFiles(firstResult?: number, maxResults?: number): PromiseLike<PublicFileModel[]> {
    return this.PublicFile.findAll({ offset: firstResult, limit: maxResults });
  }
  
  /**
   * Updates public file
   * 
   * @param id public file id
   * @param url url 
   * @returns promise for update
   */
  public updatePublicFile(id: number, url: string): PromiseLike<[number, any]> {
    return this.PublicFile.update({
      url: url
    }, {
      where: {
        id: id
      }
    });
  }
  
  /**
   * Deletes a public file
   * 
   * @param id public file id
   * @returns promise for delete
   */
  public deletePublicFile(id: number): PromiseLike<number> {
    return this.PublicFile.destroy({ where: {id: id} });
  }

  // ItemRead
  
  createItemRead(itemId: number, userId: string) {
    return this.sequelize.models.ItemRead.create({
        itemId: itemId,
        userId: userId
    });
  }
  
  findItemRead(itemId: number, userId: string) {
    return this.sequelize.models.ItemRead.findOne({ where: { userId: userId, itemId: itemId } });
  }
  
  findItemReads(itemIds: number[], userId: string) {
    return this.sequelize.models.ItemRead.findAll({ where: { userId: userId, itemId: { $in: itemIds } } });
  }
  
  updateItemRead(id: number, itemId: number, userId: string) {
    return this.sequelize.models.ItemRead.update({
      itemId: itemId,
      userId: userId
    }, {
      where: {
        id: id
      }
    });
  }
  
  upsertItemRead(itemId: number, userId: string) {
    return this.findItemRead(itemId, userId)
      .then((itemRead) => {
        if (itemRead) {
          return this.updateItemRead(itemRead.id, itemId, userId);  
        } else {
          return this.createItemRead(itemId, userId);
        }
      });
  }
  
  // QuestionGroupUserGroupRole
  
  createQuestionGroupUserGroupRole(questionGroupId: number, userGroupId: number, role: string) {
    return this.sequelize.models.QuestionGroupUserGroupRole.create({
      questionGroupId: questionGroupId, 
      userGroupId: userGroupId,
      role: role
    });
  }
  
  findQuestionGroupUserGroupRole(questionGroupId: number, userGroupId: number) {
    return this.sequelize.models.QuestionGroupUserGroupRole.findOne({ where: { questionGroupId: questionGroupId, userGroupId: userGroupId } });
  }
  
  listQuestionGroupUserGroupRolesByQuestionGroupId(questionGroupId: number) {
    return this.sequelize.models.QuestionGroupUserGroupRole.findAll({ where: { questionGroupId : questionGroupId } });
  }
  
  listQuestionGroupUserGroupRolesByQuestionGroupIds(questionGroupIds: number[]) {
    return this.sequelize.models.QuestionGroupUserGroupRole.findAll({ where: { questionGroupId : { $in: questionGroupIds } } });
  }
  
  listQuestionGroupUserGroupIds(questionGroupId: number) {
    return this.listQuestionGroupUserGroupRolesByQuestionGroupId(questionGroupId)
      .then((questionGroupUserGroupRole) => {
        return _.map(questionGroupUserGroupRole, "userGroupId");
      });
  }
  
  updateQuestionGroupUserGroupRole(id: number, role: string) {
    return this.sequelize.models.QuestionGroupUserGroupRole.update({
      role: role
    }, {
      where: {
        id: id
      }
    });
  }
  
  upsertQuestionGroupUserGroupRole(questionGroupId: number, userGroupId: number, role: string) {
    return this.findQuestionGroupUserGroupRole(questionGroupId, userGroupId)
      .then((questionGroupUserGroupRole) => {
        if (questionGroupUserGroupRole) {
          return this.updateQuestionGroupUserGroupRole(questionGroupUserGroupRole.id, role);  
        } else {
          return this.createQuestionGroupUserGroupRole(questionGroupId, userGroupId, role);
        }
      });
  }
  
  // ItemGroups
  
  /**
   * new item group
   * 
   * @param {String} sapId sapId
   * @param {String} name name
   * @param {String} displayName display name
   * @param {String} category category
   * @param {Double} minimumProfitEstimation minimum profit estimation
   * @param {int} prerequisiteContractItemGroupId prerequisiteContractItemGroupId
   * @return {Promise} promise for created item group
   */
  createItemGroup(sapId: string | null, name: string, displayName: string, category: string, minimumProfitEstimation: number, prerequisiteContractItemGroupId: number | null): Bluebird<ItemGroupModel> {
    return this.sequelize.models.ItemGroup.create({
      sapId: sapId,
      name: name,
      displayName: displayName,
      category: category,
      minimumProfitEstimation: minimumProfitEstimation,
      prerequisiteContractItemGroupId: prerequisiteContractItemGroupId
    });
  }
  
  /**
   * Updates item group
   * 
   * @param {int} id item group id
   * @param {String} name name
   * @param {String} displayName displayName
   * @param {String} category category
   * @param {Double} minimumProfitEstimation minimum profit estimation
   * @param {int} prerequisiteContractItemGroupId prerequisiteContractItemGroupId
   * @return {Promise} promise for updated item group
   */
  updateItemGroup(id: number, name: string, displayName: string, category: string, minimumProfitEstimation: number, prerequisiteContractItemGroupId: number | null): Bluebird<[number, any]> {
    return this.sequelize.models.ItemGroup.update({
      name: name,
      displayName: displayName,
      category: category,
      minimumProfitEstimation: minimumProfitEstimation,
      prerequisiteContractItemGroupId: prerequisiteContractItemGroupId
    }, {
      where: {
        id: id
      }
    });
  }
  
  /**
   * Finds a item group by id
   * 
   * @param {int} id item group id
   * @return {Promise} promise for item group
   */
  findItemGroupById(id: number): Bluebird<ItemGroupModel> {
    return this.sequelize.models.ItemGroup.findOne({ where: { id : id } });
  }
  
  /**
   * Finds a item group by externalId
   * 
   * @param {String} externalId item group externalId
   * @return {Promise} promise for item group
   */
  findItemGroupByExternalId(externalId: string): Bluebird<ItemGroupModel> {
    return this.sequelize.models.ItemGroup.findOne({ where: { externalId : externalId } });
  }
  
  /**
   * Finds a item group by sapId
   * 
   * @param {String} sapId item group sapId
   * @return {Promise} promise for item group
   */
  findItemGroupBySapId(sapId: string): Bluebird<ItemGroupModel> {
    return this.sequelize.models.ItemGroup.findOne({ where: { sapId : sapId } });
  }
  
  /**
   * Lists item groups
   * 
   * @param {int} firstResult first result
   * @param {int} maxResults max results
   * @return {Promise} promise for item groups
   */
  listItemGroups(contractUserId: string | null, firstResult?: number, maxResults?: number): Bluebird<ItemGroupModel[]> {
    const where = this.createItemGroupsWhere(contractUserId);
    return this.sequelize.models.ItemGroup.findAll({ where: where, offset: firstResult, limit: maxResults });
  }

  /**
   * Creates a where clause for listing item groups. 
   * 
   * All parameters are optional and ignored if not given
   * 
   * @param contractUserId contractUserId
   */
  private createItemGroupsWhere(contractUserId: string | null) {
    const where: any = {};
    let contractUserSQL = null;

    if (contractUserId) {
      contractUserSQL = this.sequelize.getQueryInterface().QueryGenerator.selectQuery("Contracts", {
        attributes: ["itemGroupId"],
        where: { userId: contractUserId,
                 status: "APPROVED"
                }
      }).slice(0, -1);
    }

    if (contractUserSQL) {
      where.id = { [Sequelize.Op.in]: this.sequelize.literal(`(${contractUserSQL})`) };
    } 

    return where;
  }
  
  /**
   * Deletes an item group
   * 
   * @param {int} id item group id
   * @return {Promise} promise that resolves on successful removal
   */
  deleteItemGroup(id: number): Bluebird<number> {
    return this.sequelize.models.ItemGroup.destroy({ where: { id : id } });
  }

  // ItemGroupPrice
  
  /**
   * new item group price
   * 
   * @param {int} itemGroupId item group id
   * @param {String} groupName group
   * @param {String} unit unit
   * @param {String} price price
   * @param {Integer} year year
   * @return {Promise} promise for created item group price
   */
  createItemGroupPrice(itemGroupId: number, groupName: string, unit: string, price: string, year: number): Bluebird<ItemGroupPriceModel> {
    return this.sequelize.models.ItemGroupPrice.create({
      itemGroupId: itemGroupId,
      groupName: groupName,
      unit: unit,
      price: price,
      year: year
    });
  }
    
  /**
   * Finds a item group price by id
   * 
   * @param {int} id item group id
   * @return {Promise} promise for item group
   */
  findItemGroupPriceById(id: number): Bluebird<ItemGroupPriceModel> {
    return this.sequelize.models.ItemGroupPrice.findOne({ where: { id : id } });
  }
    
  /**
   * Finds an item group price by externalId
   * 
   * @param {String} externalId item group external id
   * @return {Promise} promise for delivery place
   */
  findItemGroupPriceByExternalId(externalId: string): Bluebird<ItemGroupPriceModel> {
    return this.sequelize.models.ItemGroupPrice.findOne({ where: { externalId : externalId } });
  }
    
  /**
   * Lists item group prices.
   * 
   * All parameters are optional and ignored if not given
   * 
   * @param {int} itemGroupId item group id
   * @param {int} firstResult first result
   * @param {int} maxResults max results
   * @param {String} orderBy order by column (defaults to createdAt)
   * @param {String} orderDir order direction (defaults to DESC)
   * @return {Promise} promise for item group
   */
  listItemGroupPrices(itemGroupId?: number|null, year?: number|null, firstResult?: number|null, maxResults?: number|null, orderBy?: string|null, orderDir?: string|null): Bluebird<ItemGroupPriceModel[]> {
    const where: any = {};

    if (itemGroupId) {
      where.itemGroupId = itemGroupId;
    }

    if (year) {
      where.year = year;
    }

    return this.sequelize.models.ItemGroupPrice.findAll({ 
      where: where,
      offset: firstResult || undefined, 
      limit: maxResults || undefined,
      order: [[ orderBy || "createdAt", orderDir || "DESC" ] ]
    });
  }

  /**
   * Update item group price
   * 
   * @param {int} id item group id
   * @param {int} itemGroupId item group id
   * @param {String} groupName group
   * @param {String} unit unit
   * @param {String} price price
   * @param {Integer} year year
   * @return {Promise} promise for created item group price
   */
  updateItemGroupPrice(id: number, itemGroupId: number, groupName: string, unit: string, price: string, year: number): Bluebird<[number, any]> {
    return this.sequelize.models.ItemGroupPrice.update({
      itemGroupId: itemGroupId,
      groupName: groupName,
      unit: unit,
      price: price,
      year: year
    }, {
      where: {
        id: id
      }
    });
  }

  /**
   * Deletes an item group price
   * 
   * @param {int} id item group price id
   * @return {Promise} promise that resolves on successful removal
   */
  deleteItemGroupPrice(id: number): Bluebird<number> {
    return this.sequelize.models.ItemGroupPrice.destroy({ where: { id : id } });
  }    
  
  // DeliveryPlaces
  
  /**
   * new delivery place
   * 
   * @param {String} sapId sapId
   * @param {String} name name
   * @return {Promise} promise for created delivery place
   */
  createDeliveryPlace(sapId: string, name: string) {
    return this.sequelize.models.DeliveryPlace.create({
      sapId: sapId,
      name: name
    });
  }
    
  /**
   * Finds a delivery place by id
   * 
   * @param {int} id delivery place id
   * @return {Promise} promise for delivery place
   */
  findDeliveryPlaceById(id: number) {
    return this.sequelize.models.DeliveryPlace.findOne({ where: { id : id } });
  }
    
  /**
   * Finds a delivery place by externalId
   * 
   * @param {String} externalId delivery place externalId
   * @return {Promise} promise for delivery place
   */
  findDeliveryPlaceByExternalId(externalId: string) {
    return this.sequelize.models.DeliveryPlace.findOne({ where: { externalId : externalId } });
  }
    
  /**
   * Finds a delivery place by sapId
   * 
   * @param {String} sapId delivery place sapId
   * @return {Promise} promise for delivery place
   */
  findDeliveryPlaceBySapId(sapId: string) {
    return this.sequelize.models.DeliveryPlace.findOne({ where: { sapId : sapId } });
  }
    
  /**
   * Lists delivery places
   * 
   * @param {int} firstResult first result
   * @param {int} maxResults max results
   * @return {Promise} promise for delivery places
   */
  listDeliveryPlaces(firstResult?: number, maxResults?: number) {
    return this.sequelize.models.DeliveryPlace.findAll({ where: { }, offset: firstResult, limit: maxResults });
  }
    
  /**
   * Updates delivery place
   * 
   * @param {int} id delivery place id
   * @param {String} name name
   * @return {Promise} promise for updated delivery place
   */
  updateDeliveryPlace(id: number, name: string) {
    return this.sequelize.models.DeliveryPlace.update({
      name: name
    }, {
      where: {
        id: id
      }
    });
  }
    
  /**
   * Deletes an delivery place
   * 
   * @param {int} id delivery place id
   * @return {Promise} promise that resolves on successful removal
   */
  deleteDeliveryPlace(id: number) {
    return this.sequelize.models.DeliveryPlace.destroy({ where: { id : id } });
  }

  // Contracts

  /**
   * Create new contract
   * 
   * @param userId contract's user id
   * @param year year
   * @param deliveryPlaceId delivery place id
   * @param proposedDeliveryPlaceId proposed delivery place id
   * @param itemGroupId item group id
   * @param sapId sap id
   * @param contractQuantity contract quantity
   * @param deliveredQuantity delivered quantity
   * @param proposedQuantity proposed quantity
   * @param startDate start date
   * @param endDate end date 
   * @param signDate sign date
   * @param termDate term date
   * @param status status
   * @param areaDetails area details JSON
   * @param deliverAll deliver all
   * @param proposedDeliverAll proposed deliver all
   * @param remarks remarks
   * @param deliveryPlaceComment delivery place comment
   * @param quantityComment quantity comment
   * @param rejectComment reject  comment
   * 
   * @returns {Promise} promise for new contract
   */
  public createContract(userId: string, year: number, deliveryPlaceId: number, proposedDeliveryPlaceId: number, 
    itemGroupId: number, sapId: string|null,  contractQuantity: number|null, deliveredQuantity: number|null, proposedQuantity: number|null, 
    startDate: Date|null, endDate: Date|null, signDate: Date|null, termDate: Date|null, status: string, areaDetails: string|null, 
    deliverAll: boolean, proposedDeliverAll: boolean, remarks: string|null, deliveryPlaceComment: string|null, 
    quantityComment: string|null, rejectComment: string|null): PromiseLike<ContractModel> {

    return this.sequelize.models.Contract.create({
      userId: userId,
      year: year,
      deliveryPlaceId: deliveryPlaceId,
      proposedDeliveryPlaceId: proposedDeliveryPlaceId,
      itemGroupId: itemGroupId,
      sapId: sapId,
      contractQuantity: contractQuantity,
      deliveredQuantity: deliveredQuantity,
      proposedQuantity: proposedQuantity,
      startDate: startDate,
      endDate: endDate,
      signDate: signDate,
      termDate: termDate,
      status: status,
      areaDetails: areaDetails, 
      deliverAll: deliverAll,
      proposedDeliverAll: proposedDeliverAll,
      remarks: remarks,
      deliveryPlaceComment: deliveryPlaceComment,
      quantityComment: quantityComment,
      rejectComment: rejectComment
    });
  }

  /**
   * Updates a contract status 
   * 
   * @param {int} id 
   * @param {String} status 
   * 
   * @returns {Promise} promise for update
   */
  public updateContractStatus(id: number, status: string): Bluebird<[number, any]> {
    return this.sequelize.models.Contract.update({
      status: status
    }, {
      where: {
        id: id
      }
    });
  }

  /**
   * Updates a contract sapId 
   * 
   * @param {int} id 
   * @param {String} sapId 
   * 
   * @returns {Promise} promise for update
   */
  public updateContractSapId(id: number, sapId: string): Bluebird<[number, any]> {
    return this.sequelize.models.Contract.update({
      sapId: sapId
    }, {
      where: {
        id: id
      }
    });
  }

  /**
   * Updates a contract deliveredQuantity 
   * 
   * @param {int} id 
   * @param {String} deliveredQuantity 
   * 
   * @returns {Promise} promise for update
   */
  public updateContractDeliveredQuantity(id: number, deliveredQuantity: string): Bluebird<[number, any]> {
    return this.sequelize.models.Contract.update({
      deliveredQuantity: deliveredQuantity
    }, {
      where: {
        id: id
      }
    });
  }

  /**
   * Updates a contract 
   * 
   * @param id contract id
   * @param userId contract's user id
   * @param year year
   * @param deliveryPlaceId delivery place id
   * @param sapId SAP id
   * @param proposedDeliveryPlaceId proposed delivery place id
   * @param itemGroupId item group id
   * @param sapId sap id
   * @param contractQuantity contract quantity
   * @param deliveredQuantity delivered quantity
   * @param proposedQuantity proposed quantity
   * @param startDate start date
   * @param endDate end date 
   * @param signDate sign date
   * @param termDate term date
   * @param status status
   * @param areaDetails area details JSON
   * @param deliverAll deliver all
   * @param remarks remarks
   * @param deliveryPlaceComment delivery place comment
   * @param quantityComment quantity comment
   * @param rejectComment reject  comment
   * 
   * @returns {Promise} promise for update
   */
  public updateContract(id: number, year: number, deliveryPlaceId: number, proposedDeliveryPlaceId: number, 
    itemGroupId: number, sapId: string|null,  contractQuantity: number|null, deliveredQuantity: number|null, proposedQuantity: number|null, 
    startDate: Date|null, endDate: Date|null, signDate: Date|null, termDate: Date|null, status: string, areaDetails: string|null, 
    deliverAll: boolean, proposedDeliverAll: boolean, remarks: string|null, deliveryPlaceComment: string|null, 
    quantityComment: string|null, rejectComment: string|null): Bluebird<[number, any]> {

    return this.sequelize.models.Contract.update({
      year: year,
      deliveryPlaceId: deliveryPlaceId,
      proposedDeliveryPlaceId: proposedDeliveryPlaceId,
      itemGroupId: itemGroupId,
      sapId: sapId,
      contractQuantity: contractQuantity,
      deliveredQuantity: deliveredQuantity,
      proposedQuantity: proposedQuantity,
      startDate: startDate,
      endDate: endDate,
      signDate: signDate,
      termDate: termDate,
      status: status,
      areaDetails: areaDetails, 
      deliverAll: deliverAll,
      proposedDeliverAll: proposedDeliverAll,
      remarks: remarks,
      deliveryPlaceComment: deliveryPlaceComment,
      quantityComment: quantityComment,
      rejectComment: rejectComment
    }, {
      where: {
        id: id
      }
    });
  }

  /**
   * Finds a contract by id
   * 
   * @param {int} id contract id
   * @return {Promise} promise for contract
   */
  public findContractById(id: number): Bluebird<ContractModel> {
    return this.sequelize.models.Contract.findOne({ where: { id : id } });
  }
  
  /**
   * Finds a contract by externalId
   * 
   * @param {String} externalId contract externalId
   * @return {Promise} promise for contract
   */
  public findContractByExternalId(externalId: string): Bluebird<ContractModel> {
    return this.sequelize.models.Contract.findOne({ where: { externalId : externalId } });
  }
  
  /**
   * Finds a contract by sapId
   * 
   * @param {String} sapId contract sapId
   * @return {Promise} promise for contract
   */
  public findContractBySapId(sapId: string): Bluebird<ContractModel> {
    return this.sequelize.models.Contract.findOne({ where: { sapId : sapId } });
  }

  /**
   * Lists contracts. 
   * 
   * All parameters are optional and ignored if not given
   *  
   * @param {String} userId user id
   * @param {String} itemGroupCategory item group category
   * @param {String} itemGroupId item group id
   * @param {String} year year
   * @param {String} status status
   * @param {int} firstResult first result
   * @param {int} maxResults max results
   * @return {Promise} promise for contracts
   */
  public listContracts(userId: string | null, itemGroupCategory: number | null, itemGroupId: number | null, year: number | null, status: string | null, firstResult?: number, maxResults?: number): Bluebird<ContractModel[]> {
    const where = this.createListContractsWhere(userId, itemGroupCategory, itemGroupId, year, status);

    return this.sequelize.models.Contract.findAll({ 
      where: where, 
      offset: firstResult, 
      limit: maxResults
    });
  }

  /**
   * Lists contracts sap id is not null and have a specified status
   * 
   * @param {String} status status
   * @return {Promise} promise for contracts
   */
  public listContractsByStatusAndSapIdNotNull(status: string): Bluebird<ContractModel[]> {
    return this.sequelize.models.Contract.findAll({ 
      where: {
        status: status,
        sapId: {
          [Sequelize.Op.ne]: null
        }
      }
    });
  }

  /**
   * Lists contracts sap id is null and have a specified status
   * 
   * @param {String} status status
   * @return {Promise} promise for contracts
   */
  public listContractsByStatusAndSapIdIsNull(status: string): Bluebird<ContractModel[]> {
    return this.sequelize.models.Contract.findAll({ 
      where: {
        status: status,
        sapId: {
          [Sequelize.Op.eq]: null
        }
      }
    });
  }

  /**
   * Counts contracts. 
   * 
   * All parameters are optional and ignored if not given
   *  
   * @param {String} userId user id
   * @param {String} itemGroupCategory item group category
   * @param {String} itemGroupId item group id
   * @param {String} year year
   * @param {String} status status
   * @return {Promise} promise for contracts
   */
  public countContracts(userId: string | null, itemGroupCategory: number | null, itemGroupId: number | null, year: number | null, status: string | null): Bluebird<number> {
    const where = this.createListContractsWhere(userId, itemGroupCategory, itemGroupId, year, status);

    return this.sequelize.models.Contract.count({ 
      where: where
    });
  }

  /**
   * Creates a where clause for listing / counting contracts. 
   * 
   * All parameters are optional and ignored if not given
   *  
   * @param {String} userId user id
   * @param {String} itemGroupCategory item group category
   * @param {String} itemGroupId item group id
   * @param {String} year year
   * @param {String} status status
   * @return {Object} where clause
   */
  private createListContractsWhere(userId: string | null, itemGroupCategory: number | null, itemGroupId: number | null, year: number | null, status: string | null) {
    const where: any = {};

    if (userId) {
      where.userId = userId;
    }

    if (itemGroupId) {
      where.itemGroupId = itemGroupId;
    }

    if (year) {
      where.year = year;
    }

    if (status) {
      where.status = status;
    }

    if (itemGroupCategory) {
      const categorySQL = this.sequelize.getQueryInterface().QueryGenerator.selectQuery("ItemGroups", {
        attributes: ["id"],
        where: { category: itemGroupCategory }
      }).slice(0, -1);

      where.itemGroupId = { [Sequelize.Op.in]: this.sequelize.literal(`(${categorySQL})`) };
    }

    return where;
  }
  
  /**
   * Deletes an contract
   * 
   * @param {int} id contract id
   * @return {Promise} promise that resolves on successful removal
   */
  public deleteContract(id: number): Bluebird<number> {
    return this.sequelize.models.Contract.destroy({ where: { id : id } });
  }
  
  // DocumentTemplate

  /**
   * Creates new document template
   * 
   * @param {String} contents contents HTML
   * @param {String} header header HTML
   * @param {String} footer footer HTML
   */
  createDocumentTemplate(contents: string, header: string|null, footer: string|null) {
    return this.sequelize.models.DocumentTemplate.create({
      contents: contents,
      header: header,
      footer: footer
    });
  }
  
  /**
   * Finds a document template by id
   * 
   * @param {int} id document template id
   * @return {Promise} promise for document template
   */
  findDocumentTemplateById(id: number) {
    return this.sequelize.models.DocumentTemplate.findOne({ where: { id : id } });
  }

  /**
   * Updates a document template
   * 
   * @param {int} id document template id
   * @param {String} contents template contents
   * @param {String} header template header
   * @param {String} footer template footer
   * @return {Promise} promise for update
   */
  updateDocumentTemplate(id: number, contents: string, header: string|null, footer: string|null) {
    return this.sequelize.models.DocumentTemplate.update({
      contents: contents, 
      header: header,
      footer: footer
    }, {
      where: {
        id: id
      }
    });
  }
  
  // ContractDocumentTemplate
    
  /**
   * Creates new contract document template
   * 
   * @param {String} type type
   * @param {int} contractId contract id
   * @param {int} documentTemplateId document template id
   */
  createContractDocumentTemplate(type: string, contractId: number, documentTemplateId: number): Bluebird<ContractDocumentTemplateModel> {
    return this.sequelize.models.ContractDocumentTemplate.create({
      type: type,
      contractId: contractId,
      documentTemplateId: documentTemplateId
    });
  }

  /**
   * Finds a contract document template by externalId
   * 
   * @param {String} externalId external id
   * @return {Promise} promise for contract document template
   */
  findContractDocumentTemplateByExternalId(externalId: string): Bluebird<ContractDocumentTemplateModel> {
    return this.sequelize.models.ContractDocumentTemplate.findOne({ where: { externalId: externalId } });
  }
    
  /**
   * Finds a contract document template by type and contract id
   * 
   * @param {String} type document template type
   * @param {int} contractId contract id
   * @return {Promise} promise for contract document template
   */
  findContractDocumentTemplateByTypeAndContractId(type: string, contractId: number): Bluebird<ContractDocumentTemplateModel> {
    return this.sequelize.models.ContractDocumentTemplate.findOne({ where: { type : type, contractId: contractId } });
  }
    
  /**
   * List contract document templates by contractId
   * 
   * @param {int} contractId contract id
   * @return {Promise} promise for contract document templates
   */
  listContractDocumentTemplateByContractId(contractId: number): Bluebird<ContractDocumentTemplateModel[]> {
    return this.sequelize.models.ContractDocumentTemplate.findAll({ where: { contractId: contractId } });
  }
  
  // ItemGroupDocumentTemplate
  
  /**
   * Creates new item group document template
   * 
   * @param {String} type type
   * @param {int} itemGroupId item group id
   * @param {int} documentTemplateId document template id
   */
  createItemGroupDocumentTemplate(type: string, itemGroupId: number, documentTemplateId: number): Bluebird<ItemGroupDocumentTemplateModel> {
    return this.sequelize.models.ItemGroupDocumentTemplate.create({
      type: type,
      itemGroupId: itemGroupId,
      documentTemplateId: documentTemplateId
    });
  }

  /**
   * Finds an item group document template by type and itemGroupId id
   * 
   * @param {String} type document template type
   * @param {int} contractId contract id
   * @return {Promise} promise for contract document template
   */
  findItemGroupDocumentTemplateByTypeAndItemGroupId(type: string, itemGroupId: number): Bluebird<ItemGroupDocumentTemplateModel> {
    return this.sequelize.models.ItemGroupDocumentTemplate.findOne({ where: { type : type, itemGroupId: itemGroupId } });
  }

  /**
   * Finds an item group document template by externalId
   * 
   * @param {String} externalId externalId
   * @return {Promise} promise for contract document template
   */
  findItemGroupDocumentTemplateByExternalId(externalId: string): Bluebird<ItemGroupDocumentTemplateModel> {
    return this.sequelize.models.ItemGroupDocumentTemplate.findOne({ where: { externalId: externalId } });
  }
    
  /**
   * List item group document templates by itemGroupId
   * 
   * @param {int} contractId contract id
   * @return {Promise} promise for contract document templates
   */
  listItemGroupDocumentTemplateByItemGroupId(itemGroupId: number): Bluebird<ItemGroupDocumentTemplateModel[]> {
    return this.sequelize.models.ItemGroupDocumentTemplate.findAll({ where: { itemGroupId: itemGroupId } });
  }
  
  // ContractDocument
  
  /**
   * Create contract document
   * 
   * @param {String} type type
   * @param {int} contractId contract id
   * @param {String} vismaSignDocumentId visma sign document id
   * @returns {Promise} Promise for ContractDocument
   */
  createContractDocument(type: string, contractId: number, vismaSignDocumentId: string): Bluebird<ContractDocumentModel> {
    return this.sequelize.models.ContractDocument.create({
      type: type,
      contractId: contractId,
      vismaSignDocumentId: vismaSignDocumentId,
      signed: false
    });
  }
  
  /**
   * Finds contract document by id
   * 
   * @param {int} id contract id
   * @returns {Promise} Promise for ContractDocument
   */
  findContractDocumentById(id: number): Bluebird<ContractDocumentModel> {
    return this.sequelize.models.ContractDocument.findOne({ where: { id : id } });
  }
  
  /**
   * Finds contract document by contract id and type
   * 
   * @param {int} contractId contract id
   * @param {String} type type
   * @returns {Promise} Promise for ContractDocument
   */
  findContractDocumentByContractAndType(contractId: number, type: string): Bluebird<ContractDocumentModel> {
    return this.sequelize.models.ContractDocument.findOne({ 
      where: {
        type: type,
        contractId: contractId
      }
    });
  }
  
  /**
   * Finds contract document by visma document id
   * 
   * @param {String} vismaSignDocumentId vismaSignDocumentId
   * @returns {Promise} Promise for ContractDocument
   */
  findContractDocumentByVismaSignDocumentId(vismaSignDocumentId: string): Bluebird<ContractDocumentModel> {
    return this.sequelize.models.ContractDocument.findOne({ 
      where: {
        vismaSignDocumentId: vismaSignDocumentId
      }
    });
  }
  
  /**
   * Lists contracts documents by signed
   * :
   * @param {boolean} signed signed
   * @returns {Promise} Promise for ContractDocuments
   */
  listContractDocumentsBySigned(signed: boolean): Bluebird<ContractDocumentModel[]> {
    return this.sequelize.models.ContractDocument.findAll({ where: { signed: signed } });
  }
  
  /**
   * Updates contract document signing status
   * 
   * @param {int} id id
   * @param {boolean} signed signed
   * @returns {Promise} Promise for ContractDocument
   */
  updateContractDocumentSigned(id: number, signed: boolean): Bluebird<[number, any]> {
    return this.sequelize.models.ContractDocument.update({
      signed: signed
    }, {
      where: {
        id: id
      }
    });
  }

  /**
   * Deletes contract document
   * 
   * @param {int} id contract document id 
   */
  deleteContractDocument(id: number): Bluebird<number> {
    return this.sequelize.models.ContractDocument.destroy({ where: { id : id } });
  }
  
  // OperationReport
  
  /**
   * Create operation report
   * 
   * @param {String} type type
   * @returns {Promise} Promise for OperationReport
   */
  createOperationReport(type: string): PromiseLike<OperationReportModel> {
    return this.sequelize.models.OperationReport.create({
      type: type
    });
  }

  /**
   * Finds a operation report by externalId
   * 
   * @param {String} externalId operation report externalId
   * @return {Promise} promise for operation report
   */
  findOperationReportByExternalId(externalId: string): PromiseLike<OperationReportModel> {
    return this.sequelize.models.OperationReport.findOne({ where: { externalId : externalId } });
  }

  /**
   * List operation reports
   * 
   * @param orderBy order by column (defaults to createdAt)
   * @param orderDir order direction (defaults to DESC)
   * @param firstResult first result
   * @param maxResults maximum number of results
   * @returns {Promise} Promise for OperationReports
   */
  listOperationReports(orderBy: string | null, orderDir: string | null, firstResult?: number, maxResults?: number): PromiseLike<OperationReportModel[]> {
    return this.sequelize.models.OperationReport.findAll({ offset: firstResult, limit: maxResults, order: [ [ orderBy || "createdAt", orderDir || "DESC" ] ] });
  }

  /**
   * List operation reports by type
   * 
   * @param {String} type type
   * @param orderBy order by column (defaults to createdAt)
   * @param orderDir order direction (defaults to DESC)
   * @param firstResult first result
   * @param maxResults maximum number of results
   * @returns {Promise} Promise for OperationReports
   */
  listOperationReportsByType(type: string, orderBy: string | null, orderDir: string | null, firstResult?: number, maxResults?: number): PromiseLike<OperationReportModel[]> {
    return this.sequelize.models.OperationReport.findAll({ where: { type: type }, offset: firstResult, limit: maxResults, order: [[orderBy || "createdAt", orderDir || "DESC" ]] });
  }

  /**
   * Counts operation reports
   * 
   * @returns {Promise} Promise for count
   */
  countOperationReports(): PromiseLike<number> {
    return this.sequelize.models.OperationReport.count();
  }

  /**
   * List operation reports by type
   * 
   * @param {String} type type
   * @returns {Promise} Promise for count
   */
  countOperationReportsByType(type: string): PromiseLike<number> {
    return this.sequelize.models.OperationReport.count({ where: { type: type }});
  }

  // OperationReportItem
  
  /**
   * Create operation report item
   * 
   * @param {Integer} operationReportId operationReportId
   * @param {String} message message
   * @param {Boolean} completed completed
   * @param {Boolean} success success
   * @returns {Promise} Promise for OperationReportItem
   */
  createOperationReportItem(operationReportId: number, message: string | null, completed: boolean, success: boolean): PromiseLike<OperationReportItemModel> {
    return this.sequelize.models.OperationReportItem.create({
      operationReportId: operationReportId,
      message: message,
      completed: completed,
      success: success
    });
  }

  /**
   * List operation report items by operationReportId
   * 
   * @param {int} operationReportId operationReportId
   * @returns {Promise} Promise for OperationReportItems
   */
  listOperationReportItemsByOperationReportId(operationReportId: number): PromiseLike<OperationReportItemModel[]> {
    return this.sequelize.models.OperationReportItem.findAll({ where: { operationReportId: operationReportId } });
  }

  /**
   * Count operation report items by operationReportId and completed
   * 
   * @param {int} operationReportId operationReportId
   * @param {Boolean} completed completed
   * @returns {Promise} Promise for OperationReportItems count
   */
  countOperationReportItemsByOperationIdCompleted(operationReportId: number, completed: boolean): PromiseLike<number> {
    return this.sequelize.models.OperationReportItem.count({ where: { operationReportId: operationReportId, completed: completed } });
  }

  /**
   * Count operation report items by operationReportId, completed and success
   * 
   * @param {int} operationReportId operationReportId
   * @param {Boolean} completed completed
   * @param {Boolean} success success
   * @returns {Promise} Promise for OperationReportItems count
   */
  countOperationReportItemsByOperationIdCompletedAndSuccess(operationReportId: number, completed: boolean, success: boolean): PromiseLike<number> {
    return this.sequelize.models.OperationReportItem.count({ where: { operationReportId: operationReportId, completed: completed, success: success } });
  }

  /**
   * Updates operation report item
   * 
   * @param {int} id id
   * @param {String} message message
   * @param {Boolean} completed completed
   * @param {Boolean} success success
   * @returns {Promise} Promise for ContractDocument
   */
  updateOperationReportItem(id: number, message: string | null, completed: boolean, success: boolean): PromiseLike<[number, any]> {
    return this.sequelize.models.OperationReportItem.update({
      message: message,
      completed: completed,
      success: success
    }, {
      where: {
        id: id
      }
    });
  }
  
  /**
   * Create thread predefined text
   * 
   * @param {Integer} threadId thread id
   * @param {String} text text
   * @returns {Promise} Promise for created entity
   */
  createThreadPredefinedText(threadId: number, text: string): PromiseLike<ThreadPredefinedTextModel> {
    return this.sequelize.models.ThreadPredefinedText.create({
      threadId: threadId,
      text: text
    });
  }

  /**
   * Find ThreadPredefinedTexts
   * 
   * @param {int} id
   * @returns {Promise} Promise for ThreadPredefinedText
   */
  findThreadPredefinedTexts(id: number): PromiseLike<ThreadPredefinedTextModel> {
    return this.sequelize.models.ThreadPredefinedText.findOne({
      where: {
        id: id
      }
    });
  }

  /**
   * List ThreadPredefinedTexts
   * 
   * @param {int} threadId thread id
   * @returns {Promise} Promise for ThreadPredefinedTexts
   */
  listThreadPredefinedTextsByThreadId(threadId: number): PromiseLike<ThreadPredefinedTextModel[]> {
    return this.sequelize.models.ThreadPredefinedText.findAll({
      where: {
        threadId: threadId
      }
    });
  }

  /**
   * Updates ThreadPredefinedText 
   * 
   * @param {int} id id
   * @param {string} text text 
   */
  updateThreadPredefinedText(id: number, text: string): PromiseLike<[number, any]> {
    return this.sequelize.models.ThreadPredefinedText.update({
      text: text
    }, {
      where: {
        id: id
      }
    });
  }

  /**
   * Deletes predefined text from thread 
   * 
   * @param {int} threadId thread id
   * @return {Promise} promise that resolves on successful removal
   */
  deleteThreadPredefinedTextByThreadIdAndText(threadId: number, text: string): PromiseLike<number> {
    return this.sequelize.models.ThreadPredefinedText.destroy({ 
      where: { 
        threadId: threadId,
        text: text 
      } 
    });
  }

  // Week delivery predictions

  /**
   * Create week delivery prediction
   * 
   * @param id id
   * @param itemGroupId item group id
   * @param userId user id
   * @param amount amount
   * @param weekNumber week number
   * @param year year
   * @param days days
   * @return promise on created week delivery prediction
   */
  public createWeekDeliveryPrediction(id: string, itemGroupId: number, userId: string, amount: number, weekNumber: number, year: number, days: number): PromiseLike<WeekDeliveryPredictionModel> {
    return this.WeekDeliveryPrediction.create({
      id: id,
      itemGroupId: itemGroupId,
      userId: userId,
      amount: amount,
      weekNumber: weekNumber,
      year: year,
      days: days
    });
  }

  /**
   * Find week delivery prediction by id
   * 
   * @param weekDeliveryPredictionId weekDeliveryPredictionId
   * @return promise on created week delivery prediction
   */
  public findWeekDeliveryPredictionById(weekDeliveryPredictionId: string): PromiseLike<WeekDeliveryPredictionModel> {
    return this.WeekDeliveryPrediction.findOne({
      where: {
        id: weekDeliveryPredictionId
      }
    });
  }

  /**
   * Delete week delivery prediction
   * 
   * @param weekDeliveryPredictionId weekDeliveryPredictionId
   * @return promise on created week delivery prediction
   */
  public deleteWeekDeliveryPredictionById(weekDeliveryPredictionId: string): PromiseLike<number> {
    return this.WeekDeliveryPrediction.destroy({
      where: {
        id: weekDeliveryPredictionId
      }
    });
  }

  /**
   * Updates WeekDeliveryPrediction
   * 
   * @param id id
   * @param itemGroupId item group id
   * @param amount amount
   * @param weekNumber week number
   * @param year year
   * @param days days
   * @return promise on updated week delivery prediction
   */
  public updateWeekDeliveryPrediction(id: string, itemGroupId: number, amount: number, weekNumber: number, year: number, days: number): PromiseLike<[number, any]>  {
    return this.WeekDeliveryPrediction.update({
      itemGroupId: itemGroupId,
      amount: amount,
      weekNumber: weekNumber,
      year: year,
      days: days
    }, {
      where: {
        id: id
      }
    });
  }

  /**
   * Lists week delivery predictions
   * 
   * @param itemGroupId 
   * @param itemGroupType 
   * @param userId 
   * @param weekNumber 
   * @param year 
   * @param firstResult 
   * @param maxResults 
   * @return Promise that resolves list of week delivery predictions
   */
  public listWeekDeliveryPredictions(itemGroupId: number | null, itemGroupType: string | null, userId: string | null, weekNumber: number | null, year: number | null, firstResult?: number, maxResults?: number): Bluebird<WeekDeliveryPredictionModel[]> {
    const where = this.createListWeekDeliveryPredictionsWhere(itemGroupId, itemGroupType, userId, weekNumber, year);

    return this.WeekDeliveryPrediction.findAll({ 
      where: where, 
      offset: firstResult, 
      limit: maxResults
    });
  }

  /**
   * Creates a where clause for listing / counting week delivery predictions. 
   * 
   * All parameters are optional and ignored if not given
   *  
   * @param itemGroupId 
   * @param itemGroupType 
   * @param userId 
   * @param weekNumber 
   * @param year  
   * @return where clause
   */
  private createListWeekDeliveryPredictionsWhere(itemGroupId: number | null, itemGroupType: string | null, userId: string | null, weekNumber: number | null, year: number | null) {
    const where: any = {};

    if (itemGroupId) {
      where.itemGroupId = itemGroupId;
    }

    if (userId) {
      where.userId = userId;
    }

    if (weekNumber) {
      where.weekNumber = weekNumber;
    }

    if (year) {
      where.year = year;
    }

    if (itemGroupType) {
      const categorySQL = this.sequelize.getQueryInterface().QueryGenerator.selectQuery("ItemGroups", {
        attributes: ["id"],
        where: { type: itemGroupType }
      }).slice(0, -1);

      where.itemGroupType = { [Sequelize.Op.in]: this.sequelize.literal(`(${categorySQL})`) };
    }

    return where;
  }

  // Products

  /**
   * Create Product
   * 
   * @param id id
   * @param itemGroupId item group id
   * @param name name
   * @param units units
   * @param unitSize unitSize
   * @param unitName unitName
   * @param sapItemCode SAP ItemCode
   * @return promise on created product
   */
  public createProduct(id: string, itemGroupId: number, name: string, units: number, unitSize: number, unitName: string, sapItemCode: string): PromiseLike<ProductModel> {
    return this.Product.create({
      id: id,
      itemGroupId: itemGroupId,
      name: name,
      units: units,
      unitSize: unitSize,
      unitName: unitName,
      sapItemCode: sapItemCode
    } as any);
  }

  /**
   * Update Product
   * 
   * @param id id
   * @param itemGroupId item group id
   * @param name name
   * @param units units
   * @param unitSize unitSize
   * @param unitName unitName
   * @param sapItemCode SAP ItemCode
   * @return promise on created product
   */
  public updateProduct(id: string, itemGroupId: number, name: string, units: number, unitSize: number, unitName: string, sapItemCode: string): PromiseLike<[number, any]> {
    return this.Product.update({
      itemGroupId: itemGroupId,
      name: name,
      units: units,
      unitSize: unitSize,
      unitName: unitName,
      sapItemCode: sapItemCode
    }, {
      where: {
        id: id
      }
    });
  }

  /**
   * Delete prodcut
   * 
   * @param productId productId
   * @return promise on created week delivery prediction
   */
  public deleteProductById(productId: string): PromiseLike<number> {
    return this.Product.destroy({
      where: {
        id: productId
      }
    });
  }

  /**
   * Find product by id
   * 
   * @param productId productId
   * @return promise on created week delivery prediction
   */
  public findProductById(productId: string): PromiseLike<ProductModel> {
    return this.Product.findOne({
      where: {
        id: productId
      }
    });
  }

  /**
   * Lists products
   * 
   * @param itemGroupId itemGroupId 
   * @param itemGroupCategory itemGroupCategory
   * @param contractUserId contractUserId
   * @param firstResult 
   * @param maxResults 
   * @return Promise that resolves list of week delivery predictions
   */
  public listProducts(itemGroupId: number | null, itemGroupCategory: string | null, contractUserId: string, firstResult?: number, maxResults?: number): Bluebird<ProductModel[]> {
    const where = this.createListProductsWhere(itemGroupId, itemGroupCategory, contractUserId);

    return this.Product.findAll({ 
      where: where, 
      offset: firstResult, 
      limit: maxResults
    });
  }

  /**
   * Creates a where clause for listing / counting products. 
   * 
   * All parameters are optional and ignored if not given
   *  
   * @param itemGroupId itemGroupId
   * @param itemGroupCategory itemGroupCategory
   * @param contractUserId contractUserId
   * @return where clause
   */
  private createListProductsWhere(itemGroupId: number | null, itemGroupCategory: string | null, contractUserId: string | null) {
    const where: any = {};
    let contractUserSQL = null;
    let categorySQL = null;

    if (itemGroupId) {
      where.itemGroupId = itemGroupId;
    }

    if (contractUserId) {
      contractUserSQL = this.sequelize.getQueryInterface().QueryGenerator.selectQuery("Contracts", {
        attributes: ["itemGroupId"],
        where: { userId: contractUserId,
                 status: "APPROVED"
                }
      }).slice(0, -1);
    }

    if (itemGroupCategory) {
      categorySQL = this.sequelize.getQueryInterface().QueryGenerator.selectQuery("ItemGroups", {
        attributes: ["id"],
        where: { category: itemGroupCategory }
      }).slice(0, -1);
    }

    if (contractUserSQL && categorySQL) {
      where.itemGroupId = { [Sequelize.Op.and]: [
        { [Sequelize.Op.in]: this.sequelize.literal(`(${contractUserSQL})`) },
        { [Sequelize.Op.in]: this.sequelize.literal(`(${categorySQL})`) }
      ]}
    } else if (contractUserSQL) {
      where.itemGroupId = { [Sequelize.Op.in]: this.sequelize.literal(`(${contractUserSQL})`) };
    } else if (categorySQL) {
      where.itemGroupId = { [Sequelize.Op.in]: this.sequelize.literal(`(${categorySQL})`) };
    }

    return where;
  }

  // Deliveries

  /**
   * Create Delivery
   * 
   * @param id id
   * @param productId productId
   * @param userId userId
   * @param time time
   * @param status status
   * @param amount amount
   * @param price price
   * @param qualityId qualityId
   * @param deliveryPlaceId deliveryPlaceId
   * @return promise on created delivery
   */
  public createDelivery(id: string, productId: string, userId: string, time: Date, status: string, amount: number, price: string | null, unitPrice: number | null, unitPriceWithBonus: number | null, qualityId: string | null, deliveryPlaceId: string): PromiseLike<DeliveryModel> {
    return this.Delivery.create({
      id: id,
      productId: productId,
      userId: userId,
      time: time,
      status: status,
      amount: amount,
      price: price,
      unitPrice: unitPrice,
      unitPriceWithBonus: unitPriceWithBonus,
      qualityId: qualityId,
      deliveryPlaceId: deliveryPlaceId,
    } as any);
  }

  /**
   * Update Delivery
   * 
   * @param id id
   * @param productId productId
   * @param userId userId
   * @param time time
   * @param status status
   * @param amount amount
   * @param price price
   * @param qualityId qualityId
   * @param deliveryPlaceId deliveryPlaceId
   * @return promise on created delivery
   */
  public updateDelivery(id: string, productId: string, userId: string, time: Date, status: DeliveryStatus, amount: number, unitPrice: number | null, unitPriceWithBonus: number | null, qualityId: string | null, deliveryPlaceId: number): PromiseLike<[number, any]> {
    return this.Delivery.update({
      productId: productId,
      userId: userId,
      time: time,
      status: status,
      amount: amount,
      unitPrice: unitPrice,
      unitPriceWithBonus: unitPriceWithBonus,
      qualityId: qualityId,
      deliveryPlaceId: deliveryPlaceId,
    }, {
      where: {
        id: id
      }
    } as any);
  }

  /**
   * Find delivery by id
   * 
   * @param deliveryId deliveryId
   * @return promise on found delivery
   */
  public findDeliveryById(deliveryId: string): PromiseLike<DeliveryModel> {
    return this.Delivery.findOne({
      where: {
        id: deliveryId
      }
    });
  }

   /**
   * Delete delivery
   * 
   * @param deliveryId deliveryId
   * @return promise that resolves successful removal
   */
  public deleteDeliveryById(deliveryId: string): PromiseLike<number> {
    return this.Delivery.destroy({
      where: {
        id: deliveryId
      }
    });
  }

  /**
   * Lists deliveries
   * 
   * @param status status
   * @param userId userId
   * @param itemGroupCategory itemGroupCategory
   * @param itemGroupId itemGroupId
   * @param productId productId
   * @param deliveryPlaceId deliveryPlaceId
   * @param timeBefore timeBefore
   * @param timeAfter timeAfter
   * @param firstResult 
   * @param maxResults 
   * @return Promise that resolves list of deliveries
   */
  public listDeliveries(status: DeliveryStatus | null, userId: string | null, itemGroupCategory: ItemGroupCategory | null, itemGroupId: number | null, productId: string | null, deliveryPlaceId: number | null, timeBefore: Date | null, timeAfter: Date | null, firstResult?: number, maxResults?: number): Bluebird<DeliveryModel[]> {
    const where = this.createListDeliveriesWhere(status, userId, itemGroupCategory, itemGroupId, productId, deliveryPlaceId, timeBefore, timeAfter);

    return this.Delivery.findAll({ 
      where: where, 
      offset: firstResult, 
      limit: maxResults
    });
  }

  /**
   * Creates a where clause for listing / counting deliveries. 
   * 
   * All parameters are optional and ignored if not given
   *  
   * @param status status
   * @param userId userId
   * @param itemGroupCategory itemGroupCategory
   * @param itemGroupId itemGroupId
   * @param productId productId
   * @param deliveryPlaceId deliveryPlaceId
   * @param timeBefore timeBefore
   * @param timeAfter timeAfter
   * @return where clause
   */
  private createListDeliveriesWhere(status: DeliveryStatus | null, userId: string | null, itemGroupCategory: ItemGroupCategory | null, itemGroupId: number | null, productId: string | null, deliveryPlaceId: number | null, timeBefore: Date | null, timeAfter: Date | null) {
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (productId) {
      where.productId = productId;
    }

    if (deliveryPlaceId) {
      where.deliveryPlaceId = deliveryPlaceId;
    }

    if (userId) {
      where.userId = userId;
    }

    if (timeBefore && !timeAfter) {
      where.time = {
        $lte: timeBefore
      };
    }

    if (timeAfter && !timeBefore) {
      where.time = {
        $gte: timeAfter
      };
    }

    if (timeAfter && timeBefore) {
      where.time = {
        $between: [timeAfter, timeBefore]
      };
    }

    if (itemGroupCategory) {
      const categorySQL = this.sequelize.getQueryInterface().QueryGenerator.selectQuery("ItemGroups", {
        attributes: ["id"],
        where: { category: itemGroupCategory }
      }).slice(0, -1);

      const productSQL = this.sequelize.getQueryInterface().QueryGenerator.selectQuery("Products", {
        attributes: ["id"],
        where: { itemGroupId: { [Sequelize.Op.in]: this.sequelize.literal(`(${categorySQL})`) } }
      }).slice(0, -1);

      where.productId = { [Sequelize.Op.in]: this.sequelize.literal(`(${productSQL})`) };
    }

    if (itemGroupId) {
      const itemGroupSQL = this.sequelize.getQueryInterface().QueryGenerator.selectQuery("Products", {
        attributes: ["id"],
        where: { itemGroupId: itemGroupId }
      }).slice(0, -1);

      where.productId = { [Sequelize.Op.in]: this.sequelize.literal(`(${itemGroupSQL})`) };
    }

    return where;
  }

  // Delivery notes

  /**
   * Create DeliveryNote
   * 
   * @param id id
   * @param deliveryId deliveryId
   * @param text text
   * @param image image
   * @return promise on created delivery note
   */
  public createDeliveryNote(id: string, deliveryId: string, text: string | null, image: string | null): PromiseLike<DeliveryNoteModel> {
    return this.DeliveryNote.create({
      id: id,
      deliveryId: deliveryId,
      text: text,
      image: image
    } as any);
  }

  /**
   * Update DeliveryNote
   * 
   * @param id id
   * @param deliveryId deliveryId
   * @param text text
   * @param image image
   * @return promise on created delivery note
   */
  public updateDeliveryNote(id: string, deliveryId: string, text: string | null, image: string | null): PromiseLike<[number, any]> {
    return this.DeliveryNote.update({
      deliveryId: deliveryId,
      text: text,
      image: image
    }, {
      where: {
        id: id
      }
    } as any);
  }

  /**
   * Find delivery note by id
   * 
   * @param deliveryNoteId deliveryNoteId
   * @return promise on found delivery note
   */
  public findDeliveryNoteById(deliveryNoteId: string): PromiseLike<DeliveryNoteModel> {
    return this.DeliveryNote.findOne({
      where: {
        id: deliveryNoteId
      }
    });
  }

   /**
   * Delete delivery note
   * 
   * @param deliveryNoteId deliveryNoteId
   * @return promise that resolves successful removal
   */
  public deleteDeliveryNoteById(deliveryNoteId: string): PromiseLike<number> {
    return this.DeliveryNote.destroy({
      where: {
        id: deliveryNoteId
      }
    });
  }

  /**
   * Lists delivery notes
   * 
   * @param deliveryId deliveryId
   * @return Promise that resolves list of delivery notes
   */
  public listDeliveryNotes(deliveryId: string | null): Bluebird<DeliveryNoteModel[]> {
    const where = this.createListDeliveryNotesWhere(deliveryId);

    return this.DeliveryNote.findAll({ 
      where: where
    });
  }
  /**
   * Creates a where clause for listing / counting delivery notes
   * 
   * All parameters are optional and ignored if not given
   *  
   * @param deliveryId deliveryId
   * @return where clause
   */
  private createListDeliveryNotesWhere(deliveryId: string | null) {
    const where: any = {};

    if (deliveryId) {
      where.deliveryId = deliveryId;
    }

    return where;
  }

  // Product prices

  /**
   * Creates product price
   * 
   * @param id id 
   * @param productId productId
   * @param unit unit
   * @param price price
   * @returns promise for public file
   */
  createProductPrice(id: string, productId: string, unit: string, price: string): PromiseLike<ProductPriceModel> {
    return this.ProductPrice.create({
      id: id,
      productId: productId,
      unit: unit,
      price: price
    } as any);
  }

  /**
   * Deletes product price
   * 
   * @param id id 
   * @returns promise for public file
   */
  deleteProductPrice(id: string): PromiseLike<number> {
    return this.ProductPrice.destroy({
      where: {
        id: id
      }
    });
  }

  /**
   * Finds product price
   * 
   * @param id id 
   * @returns promise for public file
   */
  public findProductPrice(id: string): PromiseLike<ProductPriceModel> {
    return this.ProductPrice.findOne({
      where: {
        id: id
      }
    });
  }

  /**
   * Finds latest created price by for a product id
   * 
   * @param productId product id
   * @return latest created price by for a product or null if not found
   */
  public findLatestProductPrice(productId: string): PromiseLike<ProductPriceModel | null> {
    return this.ProductPrice.findOne({
      where: {
        productId: productId
      },
      limit: 1,
      order: [['createdAt', 'DESC']]
    })
  }

  /**
   * Updates product price
   * 
   * @param id id 
   * @param productId productId
   * @param unit unit
   * @param price price
   * @returns promise for public file
   */
  public updateProductPrice(id: string, productId: string, unit: string, price: string): PromiseLike<[number, any]> {
    return this.ProductPrice.update({
      productId: productId,
      unit: unit,
      price: price,
    }, {
      where: {
        id: id
      }
    } as any);
  }

  /**
   * Lists product prices
   * 
   * @param productId productId
   * @param sort sort
   * @param firstResult 
   * @param maxResults 
   * @return Promise that resolves list of deliveries
   */
  public listProductPrices(productId: string, sort: "CREATED_AT_ASC" | "CREATED_AT_DESC", firstResult?: number, maxResults?: number): Bluebird<ProductPriceModel[]> {
    let where: any = {};
    let order: any;

    where.productId = productId;

    switch (sort) {
      case "CREATED_AT_ASC":
        order = [['createdAt', 'ASC']];
        break;
      case "CREATED_AT_DESC":
        order = [['createdAt', 'DESC']];
        break;
    }

    return this.ProductPrice.findAll({ 
      where: where, 
      order: order,
      offset: firstResult, 
      limit: maxResults
    });
  }

  // Delivery qualities

  /**
   * Finds delivery quality
   * 
   * @param id id 
   * @returns promise for delivery quality
   */
  public findDeliveryQuality(id: string): PromiseLike<DeliveryQualityModel> {
    return this.DeliveryQuality.findOne({
      where: {
        id: id
      }
    });
  }

  /**
   * Lists delivery qualities
   * 
   * @param itemGroupCategory itemGroupCategory
   * @return Promise that resolves list of delivery qualities
   */
  public listDeliveryQualities(itemGroupCategory: string): PromiseLike<DeliveryQualityModel[]> {
    let where: any = {};

    where.itemGroupCategory = itemGroupCategory;

    return this.DeliveryQuality.findAll({ 
      where: where,
    });
  }

  // Unread

  /**
   * Creates new unread
   * 
   * @param id id
   * @param path path
   * @param userId user id
   * @returns promise for created unread
   */
  public createUnread(id: string, path: string, userId: string): PromiseLike<UnreadModel> {
    return this.Unread.create({
      id: id,
      path: path,
      userId: userId
    } as any);
  }

  /**
   * Finds unread
   * 
   * @param id id 
   * @returns promise for delivery quality
   */
  public findUnreadById(id: string): PromiseLike<UnreadModel> {
    return this.Unread.findOne({
      where: {
        id: id
      }
    });
  }

  /**
   * Lists unreads by path like and user id
   * 
   * @param path path like
   * @param userId user id 
   * @returns promise for unreads
   */
  public listUnreadsByPathLikeAndUserId(path: string, userId: string): PromiseLike<UnreadModel[]> {
    const where: any = {
      userId: userId
    }
    
    where.path = { [Sequelize.Op.like]: path };

    return this.Unread.findAll({
      where: where
    });
  }

  /**
   * Lists unreads by user id
   * 
   * @param path path like
   * @returns promise for unreads
   */
  public listUnreadsByUserId(userId: string): PromiseLike<UnreadModel[]> {
    const where: any = {
      userId: userId
    }
    
    return this.Unread.findAll({
      where: where
    });
  }

  /**
   * Deletes unread
   * 
   * @param id id 
   * @returns promise for deletion
   */
  public deleteUnread(id: string): PromiseLike<number> {
    return this.Unread.destroy({
      where: {
        id: id
      }
    });
  }
  
  // data sheets
  
  /**
   * Creates data sheet
   * 
   * @param url url 
   * @returns promise for data sheet
   */
  public createDataSheet(id: string, name: string, data: string): PromiseLike<DataSheetModel> {
    return this.DataSheet.create({
      id: id,
      name: name,
      data: data
    } as any);
  }
  
  /**
   * Finds a data sheet
   * 
   * @param id data sheet id
   * @returns promise for data sheet or null if not found
   */
  public findDataSheetById(id: number): PromiseLike<DataSheetModel | null> {
    return this.DataSheet.findOne({ where: { id : id } });
  }
  
  /**
   * Lists data sheets by name
   * 
   * @param name name
   * @returns promise for data sheets
   */
  public listDataSheetsByName(name: string): PromiseLike<DataSheetModel[]> {
    return this.DataSheet.findAll({ 
      where: {
        name: name
      }
    });
  }
  
  /**
   * Updates data sheet
   * 
   * @param id data sheet id
   * @param url url 
   * @returns promise for update
   */
  public updateDataSheet(id: number, name: string, data: string): PromiseLike<[number, any]> {
    return this.DataSheet.update({
      data: data,
      name: name
    }, {
      where: {
        id: id
      }
    });
  }
  
  /**
   * Deletes a data sheet
   * 
   * @param id data sheet id
   * @returns promise for delete
   */
  public deleteDataSheet(id: number): PromiseLike<number> {
    return this.DataSheet.destroy({ where: {id: id} });
  }

}

const instance = new Models();

export function initializeModels(sequelize: Sequelize.Sequelize) {
  instance.init(sequelize);
}

export default instance;