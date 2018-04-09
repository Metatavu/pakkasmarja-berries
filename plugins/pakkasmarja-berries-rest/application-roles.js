/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';

  /**
   * Application roles
   */
  class ApplicationRoles {

    /**
     * Role that allows users to list all contacts instead of just own
     */
    static get LIST_ALL_CONTACTS ()  {
      return "list-all-contacts";
    }

    /**
     * Role that allows users to update other peoples contacts
     */
    static get UPDATE_OTHER_CONTACTS ()  {
      return "update-other-contacts";
    }
   
  }

  module.exports = ApplicationRoles;

})();

