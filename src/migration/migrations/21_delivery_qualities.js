
(() => {
  "use strict";

  module.exports = {

    up: async (query, Sequelize) => {
      
      await query.createTable("DeliveryQualities", {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false, validate: { isUUID: 4 } },
        itemGroupCategory: { type: Sequelize.STRING(191), allowNull: false },
        name: { type: Sequelize.STRING(191), allowNull: false },
        priceBonus: { type: Sequelize.STRING(191), allowNull: false }
      });

      await query.removeColumn("Deliveries", "quality");
      await query.addColumn("Deliveries", "qualityId", { type: Sequelize.UUID, allowNull: true, references: { model: "DeliveryQualities", key: "id" } });
    }

  };

})();