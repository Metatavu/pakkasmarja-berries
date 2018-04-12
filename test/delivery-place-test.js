/*jshint esversion: 6 */
/* global __dirname */

(() => {
  "use strict";

  const test = require("blue-tape");
  const request = require("supertest");
  const database = require(`${__dirname}/database`);
  const operations = require(`${__dirname}/operations`);
  const auth = require(`${__dirname}/auth`);
  const deliveryPlaceDatas = require(`${__dirname}/data/delivery-places.json`);
  const deliveryPlaceSyncDatas = require(`${__dirname}/data/delivery-places-sync.json`);
  
  test("Test listing delivery places", async (t) => {
    await database.executeFile(`${__dirname}/data`, "delivery-places-setup.sql");
    
    return request("http://localhost:3002")
      .get("/rest/v1/deliveryPlaces")
      .set("Authorization", `Bearer ${await auth.getTokenUser1()}`)
      .set("Accept", "application/json")
      .expect(200)
      .then(async response => {
        t.equal(response.body.length, 2);
        t.deepEqual(response.body[0], deliveryPlaceDatas["bad02318-1a44-11e8-87a4-c7808d590a07"]);
        t.deepEqual(response.body[1], deliveryPlaceDatas["c17711ea-1a44-11e8-a7e4-5f91469b1a79"]);
        
        await database.executeFile(`${__dirname}/data`, "delivery-places-teardown.sql");
      });
  });

  test("Test listing delivery places - without token", async () => {
    await database.executeFile(`${__dirname}/data`, "delivery-places-setup.sql");
    
    return request("http://localhost:3002")
      .get("/rest/v1/deliveryPlaces")
      .set("Accept", "application/json")
      .expect(403)
      .then(async () => {
        await database.executeFile(`${__dirname}/data`, "delivery-places-teardown.sql");
      });
  });
  
  test("Test listing delivery places - invalid token", async () => {
    await database.executeFile(`${__dirname}/data`, "delivery-places-setup.sql");
    
    return request("http://localhost:3002")
      .get("/rest/v1/deliveryPlaces")
      .set("Authorization", "Bearer FAKE")
      .set("Accept", "application/json")
      .expect(403)
      .then(async () => {
        await database.executeFile(`${__dirname}/data`, "delivery-places-teardown.sql");
      });
  });
  
  test("Test finding delivery place", async (t) => {
    await database.executeFile(`${__dirname}/data`, "delivery-places-setup.sql");
    
    return request("http://localhost:3002")
      .get("/rest/v1/deliveryPlaces/bad02318-1a44-11e8-87a4-c7808d590a07")
      .set("Authorization", `Bearer ${await auth.getTokenUser1()}`)
      .set("Accept", "application/json")
      .expect(200)
      .then(async response => {
        t.deepEqual(response.body, deliveryPlaceDatas["bad02318-1a44-11e8-87a4-c7808d590a07"]);
        await database.executeFile(`${__dirname}/data`, "delivery-places-teardown.sql");
      });
  });
  
  test("Test finding delivery place - without token", async () => {
    await database.executeFile(`${__dirname}/data`, "delivery-places-setup.sql");
    
    return request("http://localhost:3002")
      .get("/rest/v1/deliveryPlaces/bad02318-1a44-11e8-87a4-c7808d590a07")
      .set("Accept", "application/json")
      .expect(403)
      .then(async () => {
        await database.executeFile(`${__dirname}/data`, "delivery-places-teardown.sql");
      });
  });
  
  test("Test finding delivery place - invalid token", async () => {
    await database.executeFile(`${__dirname}/data`, "delivery-places-setup.sql");
    
    return request("http://localhost:3002")
      .get("/rest/v1/deliveryPlaces/bad02318-1a44-11e8-87a4-c7808d590a07")
      .set("Authorization", "Bearer FAKE")
      .set("Accept", "application/json")
      .expect(403)
      .then(async () => {
        await database.executeFile(`${__dirname}/data`, "delivery-places-teardown.sql");
      });
  });
  
  test("Test finding delivery place - not found", async () => {
    await database.executeFile(`${__dirname}/data`, "delivery-places-setup.sql");
    
    return request("http://localhost:3002")
      .get("/rest/v1/deliveryPlaces/c74e5468-0fb1-11e8-a4e2-87868e24ee8b")
      .set("Authorization", `Bearer ${await auth.getTokenUser1()}`)
      .set("Accept", "application/json")
      .expect(404)
      .then(async () => {
        await database.executeFile(`${__dirname}/data`, "delivery-places-teardown.sql");
      });
  });
  
  test("Test finding delivery place - malformed id", async () => {
    await database.executeFile(`${__dirname}/data`, "delivery-places-setup.sql");
    
    return request("http://localhost:3002")
      .get("/rest/v1/deliveryPlaces/not-uuid")
      .set("Authorization", `Bearer ${await auth.getTokenUser1()}`)
      .set("Accept", "application/json")
      .expect(404)
      .then(async () => {
        await database.executeFile(`${__dirname}/data`, "delivery-places-teardown.sql");
      });
  });

  test("Test sync delivery places", async (t) => {
    const accessToken = await auth.getTokenUser1();
    
    await operations.createOperationAndWait(await auth.getAdminToken(), "SAP_DELIVERY_PLACE_SYNC");
    
    return request("http://localhost:3002")
      .get("/rest/v1/deliveryPlaces")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("Accept", "application/json")
      .expect(200)
      .then(async response => {
        const actualDeliveryPlaces = response.body;
        
        actualDeliveryPlaces.sort((a, b) => {
          return a.name.localeCompare(b.name);
        });

        deliveryPlaceSyncDatas.forEach((expected, index) => {
          Object.keys(expected).forEach((expectKey) => {
            const expectValue = expected[expectKey];
            const actualValue = response.body[index][expectKey];
            t.equal(actualValue, expectValue, `[${index}][${expectKey}] is ${actualValue}`);
          });
        });

        await Promise.all([
          database.executeFiles(`${__dirname}/data`, ["delivery-places-teardown.sql"])
        ]);
      });
  });
  
})();