/*jshint esversion: 6 */
/* global __dirname */

(() => {
  "use strict";

  const test = require("blue-tape");
  const request = require("supertest");
  const database = require(`${__dirname}/database`);
  const operations = require(`${__dirname}/operations`);
  const auth = require(`${__dirname}/auth`);
  const itemGroupDatas = require(`${__dirname}/data/item-groups.json`);
  const itemGroupSyncDatas = require(`${__dirname}/data/item-groups-sync.json`);
  const itemGroupDocumentTemplateDatas = require(`${__dirname}/data/item-group-document-templates.json`);
  const itemGroupDocumentTemplateUpdateDatas = require(`${__dirname}/data/item-group-document-templates-update.json`);
  const itemGroupPriceDatas = require(`${__dirname}/data/item-group-prices.json`);
  const itemGroupPriceCreateData = require(`${__dirname}/data/item-group-price-create.json`);
  const itemGroupPricesUpdateData = require(`${__dirname}/data/item-group-prices-update.json`);

  test("Test listing item groups", async (t) => {
    await database.executeFile(`${__dirname}/data`, "item-groups-setup.sql");
    
    return request("http://localhost:3002")
      .get("/rest/v1/itemGroups")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .expect(200)
      .then(async response => {
        t.equal(response.body.length, 2);
        t.deepEqual(response.body[0], itemGroupDatas["89723408-0f51-11e8-baa0-dfe7c7eae257"]);
        t.deepEqual(response.body[1], itemGroupDatas["98be1d32-0f51-11e8-bb59-3b8b6bbe9a20"]);
        
        await database.executeFile(`${__dirname}/data`, "item-groups-teardown.sql");
      });
  });
  
  test("Test listing item groups - without token", async () => {
    await database.executeFile(`${__dirname}/data`, "item-groups-setup.sql");
    
    return request("http://localhost:3002")
      .get("/rest/v1/itemGroups")
      .set("Accept", "application/json")
      .expect(403)
      .then(async response => {
        await database.executeFile(`${__dirname}/data`, "item-groups-teardown.sql");
      });
  });
  
  test("Test listing item groups - invalid token", async () => {
    await database.executeFile(`${__dirname}/data`, "item-groups-setup.sql");
    
    return request("http://localhost:3002")
      .get("/rest/v1/itemGroups")
      .set("Authorization", "Bearer FAKE")
      .set("Accept", "application/json")
      .expect(403)
      .then(async response => {
        await database.executeFile(`${__dirname}/data`, "item-groups-teardown.sql");
      });
  });
  
  test("Test finding item group", async (t) => {
    await database.executeFile(`${__dirname}/data`, "item-groups-setup.sql");
    
    return request("http://localhost:3002")
      .get("/rest/v1/itemGroups/89723408-0f51-11e8-baa0-dfe7c7eae257")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .expect(200)
      .then(async response => {
        t.deepEqual(response.body, itemGroupDatas["89723408-0f51-11e8-baa0-dfe7c7eae257"]);
        await database.executeFile(`${__dirname}/data`, "item-groups-teardown.sql");
      });
  });
  
  test("Test finding item group - without token", async () => {
    await database.executeFile(`${__dirname}/data`, "item-groups-setup.sql");
    
    return request("http://localhost:3002")
      .get("/rest/v1/itemGroups/89723408-0f51-11e8-baa0-dfe7c7eae257")
      .set("Accept", "application/json")
      .expect(403)
      .then(async response => {
        await database.executeFile(`${__dirname}/data`, "item-groups-teardown.sql");
      });
  });
  
  test("Test finding item group - invalid token", async () => {
    await database.executeFile(`${__dirname}/data`, "item-groups-setup.sql");
    
    return request("http://localhost:3002")
      .get("/rest/v1/itemGroups/89723408-0f51-11e8-baa0-dfe7c7eae257")
      .set("Authorization", "Bearer FAKE")
      .set("Accept", "application/json")
      .expect(403)
      .then(async response => {
        await database.executeFile(`${__dirname}/data`, "item-groups-teardown.sql");
      });
  });
  
  test("Test finding item group - not found", async () => {
    await database.executeFile(`${__dirname}/data`, "item-groups-setup.sql");
    
    return request("http://localhost:3002")
      .get("/rest/v1/itemGroups/c74e5468-0fb1-11e8-a4e2-87868e24ee8b")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .expect(404)
      .then(async response => {
        await database.executeFile(`${__dirname}/data`, "item-groups-teardown.sql");
      });
  });
  
  test("Test finding item group - malformed id", async () => {
    await database.executeFile(`${__dirname}/data`, "item-groups-setup.sql");
    
    return request("http://localhost:3002")
      .get("/rest/v1/itemGroups/not-uuid")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .expect(404)
      .then(async response => {
        await database.executeFile(`${__dirname}/data`, "item-groups-teardown.sql");
      });
  });

  test("Test sync item groups", async (t) => {
    const accessToken = await auth.getTokenDefault();
    
    await operations.createOperationAndWait(accessToken, "SAP_ITEM_GROUP_SYNC");
    
    return request("http://localhost:3002")
      .get("/rest/v1/itemGroups")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("Accept", "application/json")
      .expect(200)
      .then(async response => {
        const actualItemGroups = response.body;
        
        actualItemGroups.sort((a, b) => {
          return a.name.localeCompare(b.name);
        });

        itemGroupSyncDatas.forEach((expected, index) => {
          Object.keys(expected).forEach((expectKey) => {
            const expectValue = expected[expectKey];
            const actualValue = response.body[index][expectKey];
            t.equal(actualValue, expectValue, `[${index}][${expectKey}] is ${actualValue}`);
          });
        });

        await Promise.all([
          database.executeFiles(`${__dirname}/data`, ["item-groups-teardown.sql", "operation-reports-teardown.sql"])
        ]);
      });
  });
  
  test("Test find item group document template", async (t) => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql", "contract-documents-setup.sql"]);
    
    return request("http://localhost:3002")
      .get("/rest/v1/itemGroups/98be1d32-0f51-11e8-bb59-3b8b6bbe9a20/documentTemplates/2fe6ad72-2227-11e8-a5fd-efc457362c53")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .expect(200)
      .then(async response => {
        await database.executeFiles(`${__dirname}/data`, ["contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
        t.deepEqual(response.body, itemGroupDocumentTemplateDatas["2fe6ad72-2227-11e8-a5fd-efc457362c53"]);
      });
  });

  test("Test find item group document template - incorrect item group", async (t) => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql", "contract-documents-setup.sql"]);
    
    return request("http://localhost:3002")
      .get("/rest/v1/itemGroups/89723408-0f51-11e8-baa0-dfe7c7eae257/documentTemplates/2fe6ad72-2227-11e8-a5fd-efc457362c53")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .expect(404)
      .then(async () => {
        await database.executeFiles(`${__dirname}/data`, ["contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      });
  });

  test("Test find item group document template - invalid item group", async (t) => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql", "contract-documents-setup.sql"]);
    
    return request("http://localhost:3002")
      .get("/rest/v1/itemGroups/invalid/documentTemplates/2fe6ad72-2227-11e8-a5fd-efc457362c53")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .expect(404)
      .then(async () => {
        await database.executeFiles(`${__dirname}/data`, ["contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      });
  });
  
  test("Test find item group document template - incorrect id", async () => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql", "contract-documents-setup.sql"]);
    
    return request("http://localhost:3002")
      .get("/rest/v1/itemGroups/98be1d32-0f51-11e8-bb59-3b8b6bbe9a20/documentTemplates/2ba4ace6-2227-11e8-8cd7-ef6b34e82618")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .expect(404)
      .then(async () => {
        await database.executeFiles(`${__dirname}/data`, ["contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      });
  });
  
  test("Test find item group document template - invalid id", async () => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql", "contract-documents-setup.sql"]);
    
    return request("http://localhost:3002")
      .get("/rest/v1/itemGroups/98be1d32-0f51-11e8-bb59-3b8b6bbe9a20/documentTemplates/not-uuid")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .expect(404)
      .then(async () => {
        await database.executeFiles(`${__dirname}/data`, ["contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      });
  });
  
  test("Test list item group document templates", async (t) => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql", "contract-documents-setup.sql"]);
    
    return request("http://localhost:3002")
      .get("/rest/v1/itemGroups/98be1d32-0f51-11e8-bb59-3b8b6bbe9a20/documentTemplates")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .expect(200)
      .then(async response => {
        await database.executeFiles(`${__dirname}/data`, ["contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
        t.equal(response.body.length, 1);
        t.deepEqual(response.body[0], itemGroupDocumentTemplateDatas["2fe6ad72-2227-11e8-a5fd-efc457362c53"]);
      });
  });
  
  test("Test update item group document template", async (t) => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql", "contract-documents-setup.sql"]);
    
    return request("http://localhost:3002")
      .put("/rest/v1/itemGroups/98be1d32-0f51-11e8-bb59-3b8b6bbe9a20/documentTemplates/2fe6ad72-2227-11e8-a5fd-efc457362c53")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .send(itemGroupDocumentTemplateUpdateDatas["2fe6ad72-2227-11e8-a5fd-efc457362c53"])
      .expect(200)
      .then(async response => {
        await database.executeFiles(`${__dirname}/data`, ["contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
        t.deepEqual(response.body, itemGroupDocumentTemplateUpdateDatas["2fe6ad72-2227-11e8-a5fd-efc457362c53"]);
      });
  });
  
  test("Test listing item group prices", async (t) => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "item-groups-prices-setup.sql"]);
    
    return request("http://localhost:3002")
      .get("/rest/v1/itemGroups/98be1d32-0f51-11e8-bb59-3b8b6bbe9a20/prices")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .expect(200)
      .then(async response => {
        await database.executeFiles(`${__dirname}/data`, ["item-groups-prices-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
        t.equal(response.body.length, 2);
        t.deepEqual(response.body[0], itemGroupPriceDatas["79d937fc-3103-11e8-a1f7-5f974dead07c"]);
        t.deepEqual(response.body[1], itemGroupPriceDatas["7f1761a8-3103-11e8-b2e0-1b2fa8a35f72"]);
      });
  });

  test("Test listing item group prices - sort year desc", async (t) => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "item-groups-prices-setup.sql"]);
    
    return request("http://localhost:3002")
      .get("/rest/v1/itemGroups/98be1d32-0f51-11e8-bb59-3b8b6bbe9a20/prices?sortBy=YEAR&sortDir=DESC")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .expect(200)
      .then(async response => {
        await database.executeFiles(`${__dirname}/data`, ["item-groups-prices-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
        t.equal(response.body.length, 2);
        t.deepEqual(response.body[0], itemGroupPriceDatas["7f1761a8-3103-11e8-b2e0-1b2fa8a35f72"]);
        t.deepEqual(response.body[1], itemGroupPriceDatas["79d937fc-3103-11e8-a1f7-5f974dead07c"]);
      });
  });

  test("Test listing item group prices - sort year asc", async (t) => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "item-groups-prices-setup.sql"]);
    
    return request("http://localhost:3002")
      .get("/rest/v1/itemGroups/89723408-0f51-11e8-baa0-dfe7c7eae257/prices?sortBy=YEAR&sortDir=ASC")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .expect(200)
      .then(async response => {
        await database.executeFiles(`${__dirname}/data`, ["item-groups-prices-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
        t.equal(response.body.length, 2);
        t.deepEqual(response.body[0], itemGroupPriceDatas["2cef70dc-3103-11e8-bc28-9b65ff9275bf"]);
        t.deepEqual(response.body[1], itemGroupPriceDatas["30685c88-3103-11e8-91df-87fa68b14005"]);
      });
  });

  test("Test listing item group prices - limit", async (t) => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "item-groups-prices-setup.sql"]);
    
    return request("http://localhost:3002")
      .get("/rest/v1/itemGroups/89723408-0f51-11e8-baa0-dfe7c7eae257/prices?sortBy=YEAR&sortDir=ASC&maxResults=1")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .expect(200)
      .then(async response => {
        await database.executeFiles(`${__dirname}/data`, ["item-groups-prices-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
        t.equal(response.body.length, 1);
        t.deepEqual(response.body[0], itemGroupPriceDatas["2cef70dc-3103-11e8-bc28-9b65ff9275bf"]);
      });
  });

  test("Test listing item group prices - offset", async (t) => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "item-groups-prices-setup.sql"]);
    
    return request("http://localhost:3002")
      .get("/rest/v1/itemGroups/89723408-0f51-11e8-baa0-dfe7c7eae257/prices?sortBy=YEAR&sortDir=ASC&firstResult=1")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .expect(200)
      .then(async response => {
        await database.executeFiles(`${__dirname}/data`, ["item-groups-prices-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
        t.equal(response.body.length, 1);
        t.deepEqual(response.body[0], itemGroupPriceDatas["30685c88-3103-11e8-91df-87fa68b14005"]);
      });
  });

  test("Test listing item group prices - incorrect item group", async (t) => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "item-groups-prices-setup.sql"]);
    
    return request("http://localhost:3002")
      .get("/rest/v1/itemGroups/89723408-0f51-11e8-baa0-dfe7c7eae257/documentTemplates/2fe6ad72-2227-11e8-a5fd-efc457362c53")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .expect(404)
      .then(async () => {
        await database.executeFiles(`${__dirname}/data`, ["item-groups-prices-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      });
  });
  
  test("Test listing item group prices - invalid item group", async (t) => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "item-groups-prices-setup.sql"]);
    
    return request("http://localhost:3002")
      .get("/rest/v1/itemGroups/invalid/documentTemplates/2fe6ad72-2227-11e8-a5fd-efc457362c53")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .expect(404)
      .then(async () => {
        await database.executeFiles(`${__dirname}/data`, ["item-groups-prices-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      });
  });
  
  test("Test listing item group prices - without token", async () => {
    return request("http://localhost:3002")
      .get("/rest/v1/itemGroups/89723408-0f51-11e8-baa0-dfe7c7eae257/prices")
      .set("Accept", "application/json")
      .expect(403);
  });
  
  test("Test listing item group prices - invalid token", async () => {
    return request("http://localhost:3002")
      .get("/rest/v1/itemGroups/89723408-0f51-11e8-baa0-dfe7c7eae257/prices")
      .set("Authorization", "Bearer FAKE")
      .set("Accept", "application/json")
      .expect(403);
  });
  
  test("Test find item group price", async (t) => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "item-groups-prices-setup.sql"]);
    
    return request("http://localhost:3002")
      .get("/rest/v1/itemGroups/98be1d32-0f51-11e8-bb59-3b8b6bbe9a20/prices/79d937fc-3103-11e8-a1f7-5f974dead07c")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .expect(200)
      .then(async response => {
        await database.executeFiles(`${__dirname}/data`, ["item-groups-prices-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
        t.deepEqual(response.body, itemGroupPriceDatas["79d937fc-3103-11e8-a1f7-5f974dead07c"]);
      });
  });

  test("Test find item group price - incorrect id", async () => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "item-groups-prices-setup.sql"]);
    
    return request("http://localhost:3002")
      .get("/rest/v1/itemGroups/98be1d32-0f51-11e8-bb59-3b8b6bbe9a20/prices/12345678-3103-11e8-bc28-9b65ff9275bf")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .expect(404)
      .then(async () => {
        await database.executeFiles(`${__dirname}/data`, ["item-groups-prices-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      });
  });

  test("Test find item group price - invalid id", async () => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "item-groups-prices-setup.sql"]);
    
    return request("http://localhost:3002")
      .get("/rest/v1/itemGroups/98be1d32-0f51-11e8-bb59-3b8b6bbe9a20/prices/not-uuid")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .expect(404)
      .then(async () => {
        await database.executeFiles(`${__dirname}/data`, ["item-groups-prices-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      });
  });
   
  test("Test finding item group price - incorrect item group", async (t) => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "item-groups-prices-setup.sql"]);
    
    return request("http://localhost:3002")
      .get("/rest/v1/itemGroups/98be1d32-0f51-11e8-bb59-3b8b6bbe9a20/prices/2cef70dc-3103-11e8-bc28-9b65ff9275bf")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .expect(404)
      .then(async () => {
        await database.executeFiles(`${__dirname}/data`, ["item-groups-prices-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      });
  });
   
  test("Test finding item group price - invalid item group", async (t) => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "item-groups-prices-setup.sql"]);
    
    return request("http://localhost:3002")
      .get("/rest/v1/itemGroups/invalid/prices/2cef70dc-3103-11e8-bc28-9b65ff9275bf")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .expect(404)
      .then(async () => {
        await database.executeFiles(`${__dirname}/data`, ["item-groups-prices-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      });
  });
  
  test("Test finding item group price - without token", async () => {
    return request("http://localhost:3002")
      .get("/rest/v1/itemGroups/98be1d32-0f51-11e8-bb59-3b8b6bbe9a20/prices/12345678-3103-11e8-bc28-9b65ff9275bf")
      .set("Accept", "application/json")
      .expect(403);
  });
  
  test("Test finding item group price - invalid token", async () => {
    return request("http://localhost:3002")
      .get("/rest/v1/itemGroups/98be1d32-0f51-11e8-bb59-3b8b6bbe9a20/prices/12345678-3103-11e8-bc28-9b65ff9275bf")
      .set("Authorization", "Bearer FAKE")
      .set("Accept", "application/json")
      .expect(403);
  });
  
  test("Test create item group price", async (t) => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "item-groups-prices-setup.sql"]);
    
    return request("http://localhost:3002")
      .post("/rest/v1/itemGroups/98be1d32-0f51-11e8-bb59-3b8b6bbe9a20/prices")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .send(itemGroupPriceCreateData)
      .expect(200)
      .then(async response => {
        await database.executeFiles(`${__dirname}/data`, ["item-groups-prices-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);

        const expected = itemGroupPriceCreateData;
        Object.keys(expected).forEach((expectKey) => {
          const expectValue = expected[expectKey];
          const actualValue = response.body[expectKey];
          t.equal(actualValue, expectValue, `[${expectKey}] is ${actualValue}`);
        });
      });
  });
  
  test("Test update item group price", async (t) => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "item-groups-prices-setup.sql"]);

    return request("http://localhost:3002")
      .put("/rest/v1/itemGroups/98be1d32-0f51-11e8-bb59-3b8b6bbe9a20/prices/79d937fc-3103-11e8-a1f7-5f974dead07c")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .send(itemGroupPricesUpdateData["79d937fc-3103-11e8-a1f7-5f974dead07c"])
      .expect(200)
      .then(async response => {
        await database.executeFiles(`${__dirname}/data`, ["item-groups-prices-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
        t.deepEqual(response.body, itemGroupPricesUpdateData["79d937fc-3103-11e8-a1f7-5f974dead07c"]);
      });
  });

})();