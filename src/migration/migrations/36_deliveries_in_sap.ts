import * as Sequelize from "sequelize";
import { QueryInterface } from "sequelize";

module.exports = {

  up: async (query: QueryInterface) => {
    await query.addColumn("Deliveries", "inSap", { type: Sequelize.BOOLEAN, allowNull: false });
    await query.sequelize.query("UPDATE Deliveries SET inSap = false");
    await query.sequelize.query("UPDATE Deliveries SET inSap = true WHERE status = 'DONE'");
  }
};