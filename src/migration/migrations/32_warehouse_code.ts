import * as Sequelize from "sequelize";
import { QueryInterface } from "sequelize";

module.exports = {

  up: async (query: QueryInterface) => {
    await query.addColumn("Deliveries", "warehouseCode", { type: Sequelize.STRING(191), allowNull: true });
  }

};