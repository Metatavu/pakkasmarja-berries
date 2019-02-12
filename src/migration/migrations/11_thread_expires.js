(() => {
  "use strict";

  module.exports = {
    up: async (query, Sequelize) => {
      await query.addColumn("Threads", "expiresAt", { type: Sequelize.DATE, allowNull: true });
    }
  };

})();