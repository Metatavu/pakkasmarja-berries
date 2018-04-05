(() => {
  "use strict";

  module.exports = {

    up: async (query, Sequelize) => {
      await query.addColumn("ItemGroups", "prerequisiteContractItemGroupId", { type: Sequelize.BIGINT, allowNull: true, references: { model: "ItemGroups", key: "id" } });
    }

  };

})();