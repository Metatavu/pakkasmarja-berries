(() => {
  "use strict";

  module.exports = {

    up: async (query, Sequelize) => {
      
      await query.createTable("ItemGroups", {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        sapId: { type: Sequelize.STRING(191), allowNull: false },
        externalId: { type: Sequelize.UUID, allowNull: false },
        name: { type: Sequelize.STRING(191), allowNull: false },
        category: { type: Sequelize.STRING(191), allowNull: false },
        displayName: { type: Sequelize.STRING(191), allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false }
      });

      await query.addIndex("ItemGroups", {
        name: "UN_ITEMGROUP_SAP_ID",
        unique: true,
        fields: ["sapId"]
      });

      await query.addIndex("ItemGroups", {
        name: "UN_ITEMGROUP_EXTERNAL_ID",
        unique: true,
        fields: ["externalId"]
      });

      await query.createTable("DeliveryPlaces", {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        sapId: { type: Sequelize.STRING(191), allowNull: false },
        externalId: { type: Sequelize.UUID, allowNull: false },
        name: { type: Sequelize.STRING(191), allowNull: false },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false }
      });

      await query.addIndex("DeliveryPlaces", {
        name: "UN_DELIVERY_PLACE_SAP_ID",
        unique: true,
        fields: ["sapId"]
      });

      await query.addIndex("DeliveryPlaces", {
        name: "UN_DELIVERY_PLACE_EXTERNAL_ID",
        unique: true,
        fields: ["externalId"]
      });
      
      await query.createTable("Contracts", {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        externalId: { type: Sequelize.UUID },
        userId: { type: Sequelize.STRING(191), allowNull: false },
        itemGroupId: { type: Sequelize.BIGINT, allowNull: false, references: { model: "ItemGroups", key: "id" } },
        deliveryPlaceId: { type: Sequelize.BIGINT, allowNull: false, references: { model: "DeliveryPlaces", key: "id" } },
        proposedDeliveryPlaceId: { type: Sequelize.BIGINT, allowNull: false, references: { model: "DeliveryPlaces", key: "id" } },
        sapId: { type: Sequelize.STRING(191), allowNull: false },
        contractQuantity: { type: Sequelize.BIGINT },
        deliveredQuantity: { type: Sequelize.BIGINT },
        proposedQuantity: { type: Sequelize.BIGINT },
        year: { type: Sequelize.INTEGER, allowNull: false },
        startDate: Sequelize.DATE,
        endDate: Sequelize.DATE,
        signDate: Sequelize.DATE,
        termDate: Sequelize.DATE,
        status: { type: Sequelize.STRING(191), allowNull: false },
        remarks: Sequelize.TEXT,
        deliveryPlaceComment: Sequelize.TEXT,
        quantityComment: Sequelize.TEXT,
        rejectComment: Sequelize.TEXT,
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false }
      });

      await query.addIndex("Contracts", {
        name: "UN_CONTRACT_EXTERNAL_ID",
        unique: true,
        fields: ["externalId"]
      });

      await query.addIndex("Contracts", {
        name: "UN_CONTRACT_SAP_ID",
        unique: true,
        fields: ["sapId"]
      });

      await query.createTable("DocumentTemplates", {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        contents: { type: "LONGTEXT", allowNull: false },
        header: { type: "LONGTEXT", allowNull: true },
        footer: { type: "LONGTEXT", allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false }
      });

      await query.createTable("ContractDocuments", {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        type: { type: Sequelize.STRING(191), allowNull: false },
        contractId: { type: Sequelize.BIGINT, allowNull: false, references: { model: "Contracts", key: "id" } },
        vismaSignDocumentId: { type: Sequelize.STRING(191), allowNull: false },
        signed: { type: Sequelize.BOOLEAN, allowNull: false },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false }
      });

      await query.addIndex("ContractDocuments", {
        name: "UN_CONTRACT_DOCUMENT_CONTRACT_ID_TYPE",
        unique: true,
        fields: ["type", "contractId"]
      });

      await query.createTable("ContractDocumentTemplates", {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        externalId: { type: Sequelize.UUID },
        type: { type: Sequelize.STRING(191), allowNull: false },
        contractId: { type: Sequelize.BIGINT, allowNull: false, references: { model: "Contracts", key: "id" } },
        documentTemplateId: { type: Sequelize.BIGINT, allowNull: false, references: { model: "DocumentTemplates", key: "id" } },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false }
      });

      await query.addIndex("ContractDocumentTemplates", {
        name: "UN_CONTRACT_DOCUMENT_TEMPLATE_EXTERNAL_ID",
        unique: true,
        fields: ["externalId"]
      });

      await query.addIndex("ContractDocumentTemplates", {
        name: "UN_CONTRACT_DOCUMENT_TEMPLATE_CONTRACT_ID_TYPE",
        unique: true,
        fields: ["type", "contractId"]
      });

      await query.createTable("ItemGroupDocumentTemplates", {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        externalId: { type: Sequelize.UUID },
        type: { type: Sequelize.STRING(191), allowNull: false },
        itemGroupId: { type: Sequelize.BIGINT, allowNull: false, references: { model: "ItemGroups", key: "id" } },
        documentTemplateId: { type: Sequelize.BIGINT, allowNull: false, references: { model: "DocumentTemplates", key: "id" } },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false }
      });

      await query.addIndex("ItemGroupDocumentTemplates", {
        name: "UN_ITEM_GROUP_TEMPLATE_EXTERNAL_ID",
        unique: true,
        fields: ["externalId"]
      });

      await query.addIndex("ItemGroupDocumentTemplates", {
        name: "UN_ITEM_GROUP_TEMPLATE_ITEM_GROUP_ID_TYPE",
        unique: true,
        fields: ["type", "itemGroupId"]
      });

      await query.createTable("ItemGroupPrices", {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        externalId: { type: Sequelize.UUID },
        groupName: { type: Sequelize.STRING(191), allowNull: false },
        unit: { type: Sequelize.STRING(191), allowNull: false },
        price: { type: Sequelize.STRING(191), allowNull: false },
        year: { type: Sequelize.INTEGER, allowNull: false },
        itemGroupId: { type: Sequelize.BIGINT, allowNull: false, references: { model: "ItemGroups", key: "id" } },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false }
      });
      
      await query.createTable("OperationReports", {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        externalId: { type: Sequelize.UUID },
        type: { type: Sequelize.STRING(191), allowNull: false },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false }
      });
      
      await query.createTable("OperationReportItems", {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        message: { type: "LONGBLOB", allowNull: true },
        operationReportId: { type: Sequelize.BIGINT, allowNull: false, references: { model: "OperationReports", key: "id" } },
        completed: { type: Sequelize.BOOLEAN, allowNull: false },
        success: { type: Sequelize.BOOLEAN, allowNull: false },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false }
      });
    }

  };

})();