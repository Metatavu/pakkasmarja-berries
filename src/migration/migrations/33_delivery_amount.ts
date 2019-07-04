import * as Sequelize from "sequelize";
import { QueryInterface } from "sequelize";

module.exports = {

  up: async (query: QueryInterface) => {
    await query.changeColumn("Deliveries", "amount", { type: Sequelize.DOUBLE, allowNull: false });
  }

};