import * as _ from "lodash";
import * as Sequelize from "sequelize";

module.exports = {

  up: async (query: Sequelize.QueryInterface) => {
    // Create new chat groups table 

    await query.createTable("ChatGroups", {
      id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
      type: { type: Sequelize.STRING(191), allowNull: false },
      title: { type: Sequelize.STRING(191), allowNull: false },
      imageUrl: { type: Sequelize.STRING(191) },      
      archived: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false},
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }        
    });

    // Add groupId and remove originId columns from Threads table

    await query.addColumn("Threads", "groupId", { type: Sequelize.BIGINT, allowNull: true });
    await query.addColumn("Threads", "ownerId", { type: Sequelize.STRING(191), allowNull: true });
    await query.removeColumn("Threads", "originId");

    // Clean the database

    await query.dropTable("ThreadUserGroupRoles");
    await query.dropTable("QuestionGroupUserGroupRoles");
    await query.dropTable("QuestionGroupUserThreads");
    
    await query.changeColumn("Threads", "groupId", { type: Sequelize.BIGINT, allowNull: false, references: { model: "ChatGroups", key: "id" } }); 
  }
};