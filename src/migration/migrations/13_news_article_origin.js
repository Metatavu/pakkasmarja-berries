(() => {
  "use strict";

  module.exports = {
    up: async (query) => {
      await query.removeColumn("NewsArticles", "originId");
    }
  };

})();