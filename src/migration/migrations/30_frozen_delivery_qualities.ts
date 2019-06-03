import * as Sequelize from "sequelize";
import { QueryInterface } from "sequelize";

module.exports = {

  up: async (query: QueryInterface) => {
    await query.sequelize.query("INSERT INTO DeliveryQualities (id, itemGroupCategory, name, priceBonus, createdAt, updatedAt) VALUES ('19955d57-2a9f-4948-8df1-9da4c30f1677', 'FROZEN', 'Perus', '0', NOW(), NOW())");
  }

};