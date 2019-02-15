(() => {
  "use strict";

  module.exports = {

    up: async (query, Sequelize) => {
      
      await query.changeColumn("Contracts", "sapId", { type: Sequelize.STRING(191), allowNull: true });
    
    }

  };

})();