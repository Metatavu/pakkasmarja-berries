
(() => {
  "use strict";

  module.exports = {

    up: async (query, Sequelize) => {
      await query.addColumn("Products", "sapItemCode", { type: Sequelize.STRING(191), allowNull: true });
      await query.sequelize.query(`UPDATE Products SET sapItemCode = 'TODO'`);
      await query.changeColumn("Products", "sapItemCode", { type: Sequelize.STRING(191), allowNull: false });
    }

  };

})();