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
  
  test("Test listing item groups - without token", async (t) => {
    await database.executeFile(`${__dirname}/data`, "item-groups-setup.sql");
    
    return request("http://localhost:3002")
      .get("/rest/v1/itemGroups")
      .set("Accept", "application/json")
      .expect(403)
      .then(async response => {
        await database.executeFile(`${__dirname}/data`, "item-groups-teardown.sql");
      });
  });
  
  test("Test listing item groups - invalid token", async (t) => {
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
  
})();