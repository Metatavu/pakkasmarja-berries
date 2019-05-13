import * as Sequelize from "sequelize";
import { QueryInterface } from "sequelize";

module.exports = {

  up: async (query: QueryInterface) => {
    
    await query.createTable("Unreads", {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      path: { type: Sequelize.STRING(191), allowNull: false },
      userId: { type: Sequelize.STRING(191), allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

  }

};