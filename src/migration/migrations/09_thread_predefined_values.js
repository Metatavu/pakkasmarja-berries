(() => {
  "use strict";

  module.exports = {

    up: async (query, Sequelize) => {
      await query.createTable("ThreadPredefinedTexts", {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        threadId: { type: Sequelize.BIGINT, allowNull: false, references: { model: "Threads", key: "id" } },
        text: { type: Sequelize.STRING(191), allowNull: false },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false }        
      });

      await query.addColumn("Threads", "answerType", { type: Sequelize.STRING(191), allowNull: false, defaultValue: "TEXT" });

    }
  };

})();