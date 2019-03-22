
(() => {
  "use strict";

  module.exports = {

    up: async (query, Sequelize) => {
      
      await query.createTable("Deliveries", {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false, validate: { isUUID: 4 } },
        productId: { type: Sequelize.UUID, allowNull: false, references: { model: "Products", key: "id" } },
        userId: { type: Sequelize.UUID, allowNull: false, validate: { isUUID: 4 } },
        time: { type: Sequelize.DATE, allowNull: false },
        status: { type: Sequelize.STRING(191), allowNull: false },
        amount: { type: Sequelize.INTEGER, allowNull: false },
        price: { type: Sequelize.STRING(191), allowNull: true },
        quality: { type: Sequelize.STRING(191), allowNull: true },
        deliveryPlaceId: { type: Sequelize.BIGINT, allowNull: false, references: { model: "DeliveryPlaces", key: "id" } },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false }
      });

      await query.createTable("DeliveryNotes", {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false, validate: { isUUID: 4 } },
        deliveryId: { type: Sequelize.UUID, allowNull: false },
        text: { type: Sequelize.TEXT, allowNull: true },
        image: { type: Sequelize.STRING(191), allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false }
      });
    }

  };

})();