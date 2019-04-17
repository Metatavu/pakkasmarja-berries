
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

      await query.sequelize.query("INSERT INTO DeliveryQualities (id, itemGroupCategory, name, priceBonus) VALUES ('ee968efe-60e2-11e9-8647-d663bd873d93', 'FRESH', 'Perus', '0'), ('ee969188-60e2-11e9-8647-d663bd873d93', 'FRESH', 'Hylätty', '0'), ('33420a5c-60ec-11e9-8647-d663bd873d93', 'FRESH', 'Varoitus', '0'), ('33420d2c-60ec-11e9-8647-d663bd873d93', 'FRESH', 'Bonus', '0.20')");

      await query.removeColumn("Deliveries", "quality");
      await query.addColumn("Deliveries", "qualityId", { type: Sequelize.UUID, allowNull: true, references: { model: "DeliveryQualities", key: "id" } });
    }

  };

})();