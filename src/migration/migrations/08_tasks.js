(() => {
  "use strict";

  module.exports = {

    up: (query, Sequelize) => {
      const queues = [
        "sapContractSapIdSync"
      ];

      const creates = queues.map((queue) => {
        return query.createTable(`tasks_${queue}`, {
          id: { type: Sequelize.STRING(191), unique: true, allowNull: false },
          lock: { type: Sequelize.TEXT },
          task: { type: Sequelize.TEXT },
          priority: { type: Sequelize.NUMERIC },
          added: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false }
        });
      });
      
      return Promise.all(creates);
    }

  };

})();