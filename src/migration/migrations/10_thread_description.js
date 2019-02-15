(() => {
  "use strict";

  module.exports = {
    up: async (query) => {
      await query.addColumn("Threads", "description", { type: "LONGTEXT" });
    }
  };

})();