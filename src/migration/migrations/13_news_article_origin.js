(() => {
  "use strict";

  module.exports = {
    up: async (query, Sequelize) => {
      await query.removeColumn("NewsArticles", "originId");
    }
  };

})();