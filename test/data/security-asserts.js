/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';

  module.exports = {
   "findContact": [{
      "params": {
        "id": "677e99fd-b854-479f-afa6-74f295052770"
      },
      "with-user": "test1-testrealm1",
      "message": "Should not allow other user to find",
      "expectStatus": 403
    }],
    "listContacts": [{
      "with-user": "test1-testrealm1",
      "message": "Should not allow user to list contacts",
      "expectStatus": 403
    }],
    "updateContact": [{
      "params": {
        "id": "677e99fd-b854-479f-afa6-74f295052770"
      },
      "with-user": "test1-testrealm1",
      "message": "Should not allow other user to update contacts",
      "expectStatus": 403
    }],
    "updateContactCredentials": [{
      "params": {
        "id": "677e99fd-b854-479f-afa6-74f295052770"
      },
      "with-user": "test1-testrealm1",
      "message": "Should not allow other user to update contacts",
      "expectStatus": 403
    }],
    "createContract": [{
      "with-user": "test1-testrealm1",
      "message": "User without proper role should not be allowed to create contracts",
      "expectStatus": 403
    }],
    "createContractDocumentSignRequest": [{
      "database": {
        "setup": ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql", "contract-documents-setup.sql", "item-groups-prices-setup.sql"],
        "teardown": ["item-groups-prices-teardown.sql", "contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]
      },
      "params": {
        "id": "3950f496-0fba-11e8-9611-0b2da5ab56ce",
        "type": "group" 
      },
      "with-user": "test1-testrealm1",
      "message": "Contract must be signed by the owner of the contract",
      "expectStatus": 403
    }],
    "createContractDocumentTemplate": [{
      "database": {
        "setup": ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"],
        "teardown": ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]
      },
      "params": {
        "contractId": "3950f496-0fba-11e8-9611-0b2da5ab56ce"
      },
      "with-user": "test1-testrealm1",
      "message": "User without proper role should not be allowed to create contract document templates",
      "expectStatus": 403
    }],
    "findContract": [{
      "database": {
        "setup": ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"],
        "teardown": ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]
      },
      "params": {
        "id": "3950f496-0fba-11e8-9611-0b2da5ab56ce"
      },
      "with-user": "test1-testrealm1",
      "message": "User without proper role should not be allowed to find other user's contracts",
      "expectStatus": 403
    }],
    "findContractDocumentTemplate": [{
      "database": {
        "setup": ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql", "contract-documents-setup.sql"],
        "teardown": ["contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]
      },
      "params": {
        "id": "1d45568e-0fba-11e8-9ac4-a700da67a976",
        "contractDocumentTemplateId": "2ba4ace6-2227-11e8-8cd7-ef6b34e82618" 
      },
      "with-user": "test2-testrealm1",
      "message": "User without proper role should not be allowed to find other user's contract document templates",
      "expectStatus": 403
    }],
    "getContractDocument": [{
      "database": {
        "setup": ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql", "contract-documents-setup.sql"],
        "teardown": ["contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]
      },
      "params": {
        "id": "3950f496-0fba-11e8-9611-0b2da5ab56ce",
        "type": "group" 
      },
      "query": {
        "format": "HTML"
      },
      "with-user": "test1-testrealm1",
      "message": "User without proper role should not be allowed to find other user's contract document",
      "expectStatus": 403
    }],
    "listContractDocumentTemplates": [{
      "database": {
        "setup": ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql", "contract-documents-setup.sql"],
        "teardown": ["contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]
      },
      "params": {
        "contractId": "3950f496-0fba-11e8-9611-0b2da5ab56ce"
      },
      "with-user": "test1-testrealm1",
      "message": "User without proper role should not be allowed to list other user's contract documents",
      "expectStatus": 403
    }],
    "listContractPrices": [{
      "database": {
        "setup": ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql", "contract-documents-setup.sql"],
        "teardown": ["contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]
      },
      "params": {
        "contractId": "3950f496-0fba-11e8-9611-0b2da5ab56ce"
      },
      "with-user": "test1-testrealm1",
      "message": "User without proper role should not be allowed to list other user's contract document prices",
      "expectStatus": 403
    }],
    "listContracts": [{
      "database": {
        "setup": ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"],
        "teardown": ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]
      },
      "query": {
        "listAll": "true"
      },
      "with-user": "test1-testrealm1",
      "message": "User without proper role should not be allowed to list all contracts",
      "expectStatus": 403
    }],
    "updateContract": [{
      "database": {
        "setup": ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"],
        "teardown": ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]
      },
      "params": {
        "id": "3950f496-0fba-11e8-9611-0b2da5ab56ce"
      },
      "with-user": "test1-testrealm1",
      "message": "User should not be allowed to update other users contracts",
      "expectStatus": 403
    }],
    "updateContractDocumentTemplate": [{
      "database": {
        "setup": ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"],
        "teardown": ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]
      },
      "params": {
        "contractId": "3950f496-0fba-11e8-9611-0b2da5ab56ce"
      },
      "with-user": "test1-testrealm1",
      "message": "User without proper role should not be allowed to update contract document templates",
      "expectStatus": 403
    }],
    "findDeliveryPlace": [
      /* Logged users are allowed to find delivery places */
    ],
    "listDeliveryPlaces": [
      /* Logged users are allowed to list delivery places */
    ],
    "createItemGroupPrice": [{
      "database": {
        "setup": ["item-groups-setup.sql"],
        "teardown": ["item-groups-teardown.sql"]
      },
      "params": {
        "id": "89723408-0f51-11e8-baa0-dfe7c7eae257"
      },
      "with-user": "test1-testrealm1",
      "message": "User without proper role should not be allowed to create item group prices",
      "expectStatus": 403
    }],
    "deleteItemGroupPrice": [{
      "database": {
        "setup": ["delivery-places-setup.sql", "item-groups-setup.sql", "item-groups-prices-setup.sql"],
        "teardown": ["item-groups-prices-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]
      },
      "params": {
        "itemGroupId": "98be1d32-0f51-11e8-bb59-3b8b6bbe9a20",
        "priceId": "79d937fc-3103-11e8-a1f7-5f974dead07c"
      },
      "with-user": "test1-testrealm1",
      "message": "User without proper role should not be allowed to delete item group prices",
      "expectStatus": 403
    }],
    "findItemGroup": [
      /* Logged users are allowed to find item groups */
    ],
    "findItemGroupDocumentTemplate": [{
      "database": {
        "setup": ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql", "contract-documents-setup.sql"],
        "teardown": ["contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]
      },
      "params": {
        "itemGroupId": "98be1d32-0f51-11e8-bb59-3b8b6bbe9a20",
        "id": "2fe6ad72-2227-11e8-a5fd-efc457362c53"
      },
      "with-user": "test1-testrealm1",
      "message": "User without proper role should not be allowed to find item group document templates",
      "expectStatus": 403
    }],
    "findItemGroupPrice": [
      /* Logged users are allowed to find item group prices */
    ],
    "listItemGroupDocumentTemplates":  [{
      "database": {
        "setup": ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql", "contract-documents-setup.sql"],
        "teardown": ["contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]
      },
      "params": {
        "itemGroupId": "98be1d32-0f51-11e8-bb59-3b8b6bbe9a20"
      },
      "with-user": "test1-testrealm1",
      "message": "User without proper role should not be allowed to list item group document templates",
      "expectStatus": 403
    }],
    "listItemGroupPrices": [
      /* Logged users are allowed to list item group prices */
    ],
    "listItemGroups": [
      /* Logged users are allowed to list item groups */
    ],
    "updateItemGroupDocumentTemplate": [{
      "database": {
        "setup": ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql", "contract-documents-setup.sql"],
        "teardown": ["contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]
      },
      "params": {
        "itemGroupId": "98be1d32-0f51-11e8-bb59-3b8b6bbe9a20",
        "id": "2fe6ad72-2227-11e8-a5fd-efc457362c53"
      },
      "with-user": "test1-testrealm1",
      "message": "User without proper role should not be allowed to update item group document templates",
      "expectStatus": 403
    }],
    "updateItemGroupPrice": [{
      "database": {
        "setup": ["delivery-places-setup.sql", "item-groups-setup.sql", "item-groups-prices-setup.sql"],
        "teardown": ["item-groups-prices-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]
      },
      "params": {
        "itemGroupId": "98be1d32-0f51-11e8-bb59-3b8b6bbe9a20",
        "priceId": "79d937fc-3103-11e8-a1f7-5f974dead07c"
      },
      "with-user": "test1-testrealm1",
      "message": "User without proper role should not be allowed to update item group prices",
      "expectStatus": 403
    }],
    "findOperationReport": [{
      "database": {
        "setup": ["operation-reports-setup.sql"],
        "teardown": ["operation-reports-teardown.sql"]
      },
      "params": {
        "id": "8d74dde0-e624-4397-8563-c13ba9c4803e"
      },
      "with-user": "test1-testrealm1",
      "message": "User without proper role should not be allowed to find operation report",
      "expectStatus": 403
    }],
    "listOperationReportItems": [{
      "database": {
        "setup": ["operation-reports-setup.sql"],
        "teardown": ["operation-reports-teardown.sql"]
      },
      "params": {
        "id": "8d74dde0-e624-4397-8563-c13ba9c4803e"
      },
      "with-user": "test1-testrealm1",
      "message": "User without proper role should not be allowed to list operation report items",
      "expectStatus": 403
    }],
    "listOperationReports": [{
      "database": {
        "setup": ["operation-reports-setup.sql"],
        "teardown": ["operation-reports-teardown.sql"]
      },
      "with-user": "test1-testrealm1",
      "message": "User without proper role should not be allowed to list operations reports",
      "expectStatus": 403
    }],
    "createOperation": [{
      "with-user": "test1-testrealm1",
      "message": "User without proper role should not be allowed to create operations",
      "expectStatus": 403
    }],
    "listSignAuthenticationServices": [ 
      /* Logged users are allowed to list sign authentication services */
    ]
  };
  
})();