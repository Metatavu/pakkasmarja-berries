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

    /**
     * Role that allows users create new contracts
     */
    static get CREATE_CONTRACT ()  {
      return "create-contract";
    }

    /**
     * Role that allows users to list all contracts
     */
    static get LIST_ALL_CONTRACTS ()  {
      return "list-all-contracts";
    }

    /**
     * Role that allows users to update other peoples contracts
     */
    static get UPDATE_OTHER_CONTRACTS ()  {
      return "update-other-contracts";
    }

    /**
     * Role that allows users to create contract document templates
     */
    static get CREATE_CONTRACT_DOCUMENT_TEMPLATES ()  {
      return "create-contract-document-templates";
    }

    /**
     * Role that allows users to list contract document templates
     */
    static get LIST_CONTRACT_DOCUMENT_TEMPLATES() {
      return "list-contract-document-templates";
    }

    /**
     * Role that allows users to update contract document templates
     */
    static get UPDATE_CONTRACT_DOCUMENT_TEMPLATES ()  {
      return "update-contract-document-templates";
    }
   
  }

  module.exports = ApplicationRoles;

})();

