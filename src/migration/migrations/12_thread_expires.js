(() => {
  "use strict";

  module.exports = {
    up: async (query, Sequelize) => {
      await query.addColumn("Threads", "pollAllowOther", { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: false });
    }
  };

})();