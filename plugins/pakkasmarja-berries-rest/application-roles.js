/*jshint esversion: 6 */
/* global __dirname */

(() => {
  "use strict";

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

    /**
     * Role that allows users to list item group document templates
     */
    static get LIST_ITEM_GROUP_DOCUMENT_TEMPLATES() {
      return "list-item-group-document-templates";
    }

    /**
     * Role that allows users to update item group document templates
     */
    static get UPDATE_ITEM_GROUP_DOCUMENT_TEMPLATES() {
      return "update-item-group-document-templates";
    }

    /**
     * Role that allows users to create item group prices
     */
    static get CREATE_ITEM_GROUP_PRICES() {
      return "create-item-group-prices";
    }

    /**
     * Role that allows users to update item group prices
     */
    static get UPDATE_ITEM_GROUP_PRICES() {
      return "update-item-group-prices";
    }

    /**
     * Role that allows users to update item group prices
     */
    static get DELETE_ITEM_GROUP_PRICES() {
      return "delete-item-group-prices";
    }

    /**
     * Role that allows users to list operation reports
     */
    static get LIST_OPERATION_REPORTS() {
      return "list-operation-reports";
    }

    /**
     * Role that allows users to create operations
     */
    static get CREATE_OPERATIONS() {
      return "create-operations";
    }
    
    /**
     * Role that allows users to manage chat
     */
    static get MANAGE_THREADS() {
      return "manage-threads";
    }

  }

  module.exports = ApplicationRoles;

})();

