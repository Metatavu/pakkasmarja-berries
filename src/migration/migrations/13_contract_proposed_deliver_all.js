(() => {
  "use strict";

  module.exports = {

    up: async (query, Sequelize) => {
      
      await query.addColumn("Contracts", "proposedDeliverAll", { type: Sequelize.BOOLEAN, allowNull: true });
      await query.sequelize.query("UPDATE Contracts SET proposedDeliverAll = deliverAll");
      await query.changeColumn("Contracts", "proposedDeliverAll", { type: Sequelize.BOOLEAN, allowNull: false });
      
    }

  };

})();