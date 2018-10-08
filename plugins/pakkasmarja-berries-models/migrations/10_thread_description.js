(() => {
  "use strict";

  module.exports = {
    up: async (query, Sequelize) => {
      await query.addColumn("Threads", "description", { type: "LONGTEXT" });
    }
  };

})();