
(() => {
  "use strict";

  module.exports = {

    up: async (query, Sequelize) => {
      
      await query.createTable("WeekDeliveryPredictions", {
        id: { type: Sequelize.UUID, primaryKey: true, validate: { notNull: true }, allowNull: false, validate: { isUUID: 4 } },
        itemGroupId: { type: Sequelize.BIGINT, allowNull: false, references: { model: "ItemGroups", key: "id" } },
        userId: { type: Sequelize.STRING(191), allowNull: false },
        amount: { type: Sequelize.BIGINT, allowNull: false },
        weekNumber: { type: Sequelize.INTEGER, allowNull: false },
        year: { type: Sequelize.INTEGER, allowNull: false },
        days: { type: Sequelize.TINYINT, allowNull: false },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false }
      });
    }

  };

})();