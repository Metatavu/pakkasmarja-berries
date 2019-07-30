import * as Sequelize from "sequelize";
import { QueryInterface } from "sequelize";

module.exports = {

  up: async (query: QueryInterface) => {
    await query.addColumn("DeliveryQualities", "displayName", { type: Sequelize.STRING(191), allowNull: false });
    await query.createTable("DeliveryQualityProducts", {
      id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
      deliveryQualityId: { type: Sequelize.UUID, allowNull: false, references: { model: "DeliveryQualities", key: "id" } },
      productId: { type: Sequelize.UUID, allowNull: false, references: { model: "Products", key: "id" } },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }        
    });
    await query.addConstraint("DeliveryQualityProducts", ["productId", "deliveryQualityId"], {
      type: 'unique',
      name: 'UN_DELIVERYQUALITYPRODUCTS_PRODUCT_DELIVERYQUALITY'
     });
    await query.sequelize.query("UPDATE DeliveryQualities SET displayName = name");
    await query.sequelize.query("INSERT INTO DeliveryQualityProducts (deliveryQualityId, productId, createdAt, updatedAt) SELECT d.id, p.id, NOW(), NOW() FROM Products p, DeliveryQualities d");
  }
};


