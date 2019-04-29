
(() => {
  "use strict";

  module.exports = {

    up: async (query, Sequelize) => {
      await query.addColumn("DeliveryQualities", "color", { type: Sequelize.STRING(191), allowNull: true });

      await query.sequelize.query("UPDATE DeliveryQualities SET color = '#fbb610' WHERE name = 'Perus'");
      await query.sequelize.query("UPDATE DeliveryQualities SET color = '#42ad18' WHERE name = 'Bonus'");
      await query.sequelize.query("UPDATE DeliveryQualities SET color = '#a771df' WHERE name = 'Varoitus'");
      await query.sequelize.query("UPDATE DeliveryQualities SET color = '#a6bee2' WHERE name = 'Hylätty'");
      
      await query.changeColumn("DeliveryQualities", "color", { type: Sequelize.STRING(191), allowNull: false });
    }

  };
  
})();