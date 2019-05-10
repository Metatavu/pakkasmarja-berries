
(() => {
  "use strict";

  module.exports = {

    up: async (query, Sequelize) => {
      await query.addColumn("Deliveries", "unitPrice", { type: Sequelize.DOUBLE, allowNull: true });
      await query.addColumn("Deliveries", "unitPriceWithBonus", { type: Sequelize.DOUBLE, allowNull: true });
      await query.removeColumn("Deliveries", "price");
    }

  };

})();