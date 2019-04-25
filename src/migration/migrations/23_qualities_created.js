
(() => {
  "use strict";

  module.exports = {

    up: async (query, Sequelize) => {
      await query.addColumn("DeliveryQualities", "createdAt", { type: Sequelize.DATE, allowNull: true });
      await query.addColumn("DeliveryQualities", "updatedAt", { type: Sequelize.DATE, allowNull: true });
      await query.sequelize.query(`UPDATE DeliveryQualities SET createdAt = NOW(), updatedAt = NOW()`);
      await query.changeColumn("DeliveryQualities", "createdAt", { type: Sequelize.DATE, allowNull: false });
      await query.changeColumn("DeliveryQualities", "updatedAt", { type: Sequelize.DATE, allowNull: false });
    }

  };

})();