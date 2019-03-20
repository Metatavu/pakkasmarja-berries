
(() => {
  "use strict";

  module.exports = {

    up: async (query, Sequelize) => {
      
      await query.createTable("Products", {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false, validate: { isUUID: 4 } },
        itemGroupId: { type: Sequelize.BIGINT, allowNull: false, references: { model: "ItemGroups", key: "id" } },
        name: { type: Sequelize.STRING(191), allowNull: false },
        units: { type: Sequelize.INTEGER, allowNull: false },
        unitSize: { type: Sequelize.INTEGER, allowNull: false },
        unitName: { type: Sequelize.STRING(191), allowNull: false },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false }
      });
    }

  };

})();