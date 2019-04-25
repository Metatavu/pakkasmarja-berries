
(() => {
  "use strict";

  module.exports = {

    up: async (query, Sequelize) => {
      await query.removeColumn("DeliveryQualities", "priceBonus");
      await query.addColumn("DeliveryQualities", "priceBonus", { type: Sequelize.DOUBLE, allowNull: false, defaultValue: 0 });      
    }

  };
  
})();