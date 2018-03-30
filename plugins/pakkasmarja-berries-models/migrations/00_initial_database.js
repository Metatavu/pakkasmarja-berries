(() => {
  "use strict";

  const Promise = require("bluebird");

  module.exports = {

    up: async (query, Sequelize) => {

      await query.createTable("Sessions", {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        userId: { type: Sequelize.STRING(191), allowNull: false },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false }
      });
      
      await query.createTable("ConnectSessions", {
        sid: { type: Sequelize.STRING(191), primaryKey: true },
        userId: Sequelize.STRING(191),
        expires: Sequelize.DATE,
        data: Sequelize.TEXT,
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false }
      });

      await query.createTable("UserSettings", {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        userId: { type: Sequelize.STRING(191), allowNull: false },
        settingKey: { type: Sequelize.STRING(191), allowNull: false },
        settingValue: { type: Sequelize.STRING(191) },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false }
      });

      await query.addIndex("UserSettings", {
        name: "UN_USERSETTING_USERID_SETTINGKEY",
        unique: true,
        fields: ["userId", "settingKey"]
      });

      await query.createTable("Threads", {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        title: { type: Sequelize.STRING(191) },
        type: { type: Sequelize.STRING(191), allowNull: false },
        originId: { type: Sequelize.STRING(191) },
        imageUrl: { type: Sequelize.STRING(191), validate: { isUrl: true } },
        archived: { type: Sequelize.BOOLEAN, allowNull: false },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false }
      });

      await query.createTable("ThreadUserGroupRoles", {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        threadId: { type: Sequelize.BIGINT, allowNull: false, references: { model: "Threads", key: "id" } },
        userGroupId: { type: Sequelize.STRING(191), allowNull: false },
        role: { type: Sequelize.STRING(191), allowNull: false },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false }
      });

      await query.addIndex("ThreadUserGroupRoles", {
        name: "UN_THREADUSERGROUPROLE_THREADID_USERGROUPID",
        unique: true,
        fields: ["threadId", "userGroupId"]
      });

      await query.createTable("Messages", {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        threadId: { type: Sequelize.BIGINT, allowNull: false, references: { model: "Threads", key: "id" } },
        userId: { type: Sequelize.STRING(191), allowNull: false },
        contents: { type: Sequelize.TEXT, allowNull: false },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false }
      });

      await query.createTable("QuestionGroups", {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        title: { type: Sequelize.STRING(191), allowNull: false },
        originId: { type: Sequelize.STRING(191), allowNull: false },
        imageUrl: { type: Sequelize.STRING(191) },
        archived: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false},
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false }
      });

      await query.createTable("QuestionGroupUserGroupRoles", {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        questionGroupId: { type: Sequelize.BIGINT, allowNull: false, references: { model: "QuestionGroups", key: "id" } },
        userGroupId: { type: Sequelize.STRING(191), allowNull: false },
        role: { type: Sequelize.STRING(191), allowNull: false },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false }
      });

      await query.addIndex("QuestionGroupUserGroupRoles", {
        name: "UN_QUESTIONGROUPUSERGROUPROLE_QUESTIONGROUPID_USERGROUPID",
        unique: true,
        fields: ["questionGroupId", "userGroupId"]
      });

      await query.createTable("QuestionGroupUserThreads", {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        questionGroupId: { type: Sequelize.BIGINT, allowNull: false, references: { model: "QuestionGroups", key: "id" } },
        threadId: { type: Sequelize.BIGINT, allowNull: false, references: { model: "Threads", key: "id" } },
        userId: { type: Sequelize.STRING(191), allowNull: false },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false }
      });

      await query.addIndex("QuestionGroupUserThreads", {
        name: "UN_QUESTIONGROUPUSERTHREAD_QUESTIONGROUPID_THREADID",
        unique: true,
        fields: ["questionGroupId", "threadId"]
      });

      await query.createTable("NewsArticles", {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        title: { type: Sequelize.STRING(191), allowNull: false },
        contents: { type: "LONGTEXT", allowNull: false },
        originId: { type: Sequelize.STRING(191), allowNull: false },
        imageUrl: { type: Sequelize.STRING(191) },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false }
      });

      await query.createTable("MessageAttachments", {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        messageId: { type: Sequelize.BIGINT, allowNull: false, references: { model: "Messages", key: "id" } },
        contents: { type: "LONGBLOB", allowNull: false },
        contentType: { type: Sequelize.STRING(191), allowNull: false },
        fileName: { type: Sequelize.STRING(191) },
        size: { type: Sequelize.BIGINT },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false }
      });

      await query.createTable("ItemReads", {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        userId: { type: Sequelize.STRING(191), allowNull: false },
        itemId: { type: Sequelize.STRING(191), allowNull: false },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false }
      });

      await query.addIndex("ItemReads", {
        name: "UN_ITEMREAD_USERID_ITEMID",
        unique: true,
        fields: ["userId", "itemId"]
      });
    }

  };

})();