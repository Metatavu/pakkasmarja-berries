import * as Sequelize from "sequelize";
import { QueryInterface } from "sequelize";

module.exports = {

  up: async (query: QueryInterface) => {
    await query.addColumn("Products", "active", { type: Sequelize.BOOLEAN, allowNull: false });
    await query.sequelize.query("UPDATE Products SET active = true");
  }
};