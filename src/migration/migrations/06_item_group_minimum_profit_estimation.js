(() => {
  "use strict";

  module.exports = {

    up: async (query, Sequelize) => {
      await query.addColumn("ItemGroups", "minimumProfitEstimation", { type: Sequelize.DOUBLE, allowNull: false, defaultValue: 0 });
    }

  };

})();