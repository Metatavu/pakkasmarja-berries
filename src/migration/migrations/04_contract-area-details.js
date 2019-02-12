(() => {
  "use strict";

  module.exports = {

    up: async (query, Sequelize) => {
      
      await query.addColumn("Contracts", "areaDetails", { type: "LONGTEXT" });
      await query.addColumn("Contracts", "deliverAll", { type: Sequelize.BOOLEAN, allowNull: false });
      
    }

  };

})();