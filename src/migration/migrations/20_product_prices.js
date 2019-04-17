
(() => {
  "use strict";

  module.exports = {

    up: async (query, Sequelize) => {
      
      await query.createTable("ProductPrices", {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false, validate: { isUUID: 4 } },
        productId: { type: Sequelize.UUID, allowNull: false, references: { model: "Products", key: "id" } },
        unit: { type: Sequelize.STRING(191), allowNull: false },
        price: { type: Sequelize.STRING(191), allowNull: false },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false }
      });
    }

  };

})();