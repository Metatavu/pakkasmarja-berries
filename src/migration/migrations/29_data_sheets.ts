import * as Sequelize from "sequelize";
import { QueryInterface } from "sequelize";
import userManagement from "../../user-management";
import ApplicationRoles from "src/rest/application-roles";

module.exports = {

  up: async (query: QueryInterface) => {
    const role = await userManagement.findRealmRole(ApplicationRoles.MANAGE_DATA_SHEETS);
    if (!role) {
      userManagement.createRealmRole(ApplicationRoles.MANAGE_DATA_SHEETS);
    }

    await query.createTable("DataSheets", {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      name: { type: Sequelize.STRING(191), allowNull: false },
      data: { type: "LONGTEXT", allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

  }

};