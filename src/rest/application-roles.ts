/**
 * Application roles
 */
export default class ApplicationRoles {

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
   * Role that allows users to update other peoples week delivery predictions
   */
  static get UPDATE_OTHER_WEEK_DELIVERY_PREDICTION () {
    return "update-other-week-delivery-predictions";
  }

  /**
   * Role that allows users to list other peoples week delivery predictions
   */
  static get LIST_ALL_WEEK_DELIVERY_PREDICTION () {
    return "list-all-week-delivery-predictions";
  }

  /**
   * Role that allows users to delete week delivery predictions
   */
  static get DELETE_WEEK_DELIVERY_PREDICTIONS () {
    return "delete-week-delivery-predictions";
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
   * Role that allows users to create item groups
   */
  static get CREATE_ITEM_GROUPS() {
    return "create-item-groups";
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
  
  /**
   * Role that allows users manage news articles
   */
  static get MANAGE_NEWS_ARTICLES() {
    return "manage-news-articles";
  }

  /**
   * Role that allows users create chat groups
   */
  static get CREATE_CHAT_GROUPS() {
    return "create-chat-groups";
  }

  /**
   * Role that allows users create products
   */
  static get CREATE_PRODUCTS() {
    return "create-products";
  }

  /**
   * Role that allows users create products
   */
  static get UPDATE_PRODUCTS() {
    return "update-products";
  }

   /**
   * Role that allows users create products
   */
  static get DELETE_PRODUCTS() {
    return "delete-products";
  }

  /**
   * Role that allows user to list other user products
   */
  static get LIST_OTHER_CONTRACT_PRODUCTS() {
    return "list-other-users-contract-products";
  }

  /**
   * Role that allows deleting other deliveries
   */
  static get DELETE_OTHER_DELIVERIES() {
    return "delete-other-deliveries";
  }

  /**
   * Role that allows updating other deliveries
   */
  static get UPDATE_OTHER_DELIVERIES() {
    return "update-other-deliveries";
  }

  /**
   * Role that allows listing and finding other users deliveries
   */
  static get LIST_AND_FIND_OTHER_DELIVERIES() {
    return "list-other-deliveries";
  }

  /**
   * Role that allows managing product prices
   */
  static get MANAGE_PRODUCT_PRICES() {
    return "manage-product-prices";
  }

  /**
   * Role that allows managing data sheets
   */
  static get MANAGE_DATA_SHEETS() {
    return "manage-data-sheets";
  }

}