
(() => {
  "use strict";

  const userManagement = require(__dirname + "/../../user-management").default;

  module.exports = {

    up: async (query, Sequelize) => {
      const role = await userManagement.findRealmRole("create-chat-groups");
      if (role) {
        const existing = await userManagement.findRolePolicyByName("chat-admin");
        if (!existing) {
          await userManagement.createRolePolicy("chat-admin", [ role.id ]);
        }
      } else {
        throw new Error("Could not find role 'create-chat-groups'");
      }

    }

  };
  
})();