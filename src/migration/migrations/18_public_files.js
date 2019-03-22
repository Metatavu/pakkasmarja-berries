
(() => {
  "use strict";

  module.exports = {

    up: async (query, Sequelize) => {
      
      await query.createTable("PublicFiles", {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false, validate: { isUUID: 4 } },
        url: { type: Sequelize.STRING(191), allowNull: false }
      });
    }

  };

})();