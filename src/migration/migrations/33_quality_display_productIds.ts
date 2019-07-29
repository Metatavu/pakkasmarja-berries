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
  }
};


