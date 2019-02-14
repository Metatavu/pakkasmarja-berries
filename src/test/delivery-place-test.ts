import * as test from "blue-tape"; 
import * as request from "supertest";
import auth from "./auth";
import database from "./database";
import operations from "./operations";

const testDataDir = `${__dirname}/../../src/test/data/`;
const deliveryPlaceDatas = require(`${testDataDir}/delivery-places.json`);
const deliveryPlaceSyncDatas = require(`${testDataDir}/delivery-places-sync.json`);

test("Test listing delivery places", async (t) => {
  await database.executeFile(testDataDir, "delivery-places-setup.sql");
  
  return request("http://localhost:3002")
    .get("/rest/v1/deliveryPlaces")
    .set("Authorization", `Bearer ${await auth.getTokenUser1()}`)
    .set("Accept", "application/json")
    .expect(200)
    .then(async response => {
      t.equal(response.body.length, 2);
      t.deepEqual(response.body[0], deliveryPlaceDatas["bad02318-1a44-11e8-87a4-c7808d590a07"]);
      t.deepEqual(response.body[1], deliveryPlaceDatas["c17711ea-1a44-11e8-a7e4-5f91469b1a79"]);
      
      await database.executeFile(testDataDir, "delivery-places-teardown.sql");
    });
});

test("Test listing delivery places - without token", async () => {
  await database.executeFile(testDataDir, "delivery-places-setup.sql");
  
  return request("http://localhost:3002")
    .get("/rest/v1/deliveryPlaces")
    .set("Accept", "application/json")
    .expect(403)
    .then(async () => {
      await database.executeFile(testDataDir, "delivery-places-teardown.sql");
    });
});

test("Test listing delivery places - invalid token", async () => {
  await database.executeFile(testDataDir, "delivery-places-setup.sql");
  
  return request("http://localhost:3002")
    .get("/rest/v1/deliveryPlaces")
    .set("Authorization", "Bearer FAKE")
    .set("Accept", "application/json")
    .expect(403)
    .then(async () => {
      await database.executeFile(testDataDir, "delivery-places-teardown.sql");
    });
});

test("Test finding delivery place", async (t) => {
  await database.executeFile(testDataDir, "delivery-places-setup.sql");
  
  return request("http://localhost:3002")
    .get("/rest/v1/deliveryPlaces/bad02318-1a44-11e8-87a4-c7808d590a07")
    .set("Authorization", `Bearer ${await auth.getTokenUser1()}`)
    .set("Accept", "application/json")
    .expect(200)
    .then(async response => {
      t.deepEqual(response.body, deliveryPlaceDatas["bad02318-1a44-11e8-87a4-c7808d590a07"]);
      await database.executeFile(testDataDir, "delivery-places-teardown.sql");
    });
});

test("Test finding delivery place - without token", async () => {
  await database.executeFile(testDataDir, "delivery-places-setup.sql");
  
  return request("http://localhost:3002")
    .get("/rest/v1/deliveryPlaces/bad02318-1a44-11e8-87a4-c7808d590a07")
    .set("Accept", "application/json")
    .expect(403)
    .then(async () => {
      await database.executeFile(testDataDir, "delivery-places-teardown.sql");
    });
});

test("Test finding delivery place - invalid token", async () => {
  await database.executeFile(testDataDir, "delivery-places-setup.sql");
  
  return request("http://localhost:3002")
    .get("/rest/v1/deliveryPlaces/bad02318-1a44-11e8-87a4-c7808d590a07")
    .set("Authorization", "Bearer FAKE")
    .set("Accept", "application/json")
    .expect(403)
    .then(async () => {
      await database.executeFile(testDataDir, "delivery-places-teardown.sql");
    });
});

test("Test finding delivery place - not found", async () => {
  await database.executeFile(testDataDir, "delivery-places-setup.sql");
  
  return request("http://localhost:3002")
    .get("/rest/v1/deliveryPlaces/c74e5468-0fb1-11e8-a4e2-87868e24ee8b")
    .set("Authorization", `Bearer ${await auth.getTokenUser1()}`)
    .set("Accept", "application/json")
    .expect(404)
    .then(async () => {
      await database.executeFile(testDataDir, "delivery-places-teardown.sql");
    });
});

test("Test finding delivery place - malformed id", async () => {
  await database.executeFile(testDataDir, "delivery-places-setup.sql");
  
  return request("http://localhost:3002")
    .get("/rest/v1/deliveryPlaces/not-uuid")
    .set("Authorization", `Bearer ${await auth.getTokenUser1()}`)
    .set("Accept", "application/json")
    .expect(404)
    .then(async () => {
      await database.executeFile(testDataDir, "delivery-places-teardown.sql");
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
      
      actualDeliveryPlaces.sort((a: any, b: any) => {
        return a.name.localeCompare(b.name);
      });

      deliveryPlaceSyncDatas.forEach((expected: any, index: number) => {
        Object.keys(expected).forEach((expectKey) => {
          const expectValue = expected[expectKey];
          const actualValue = response.body[index][expectKey];
          t.equal(actualValue, expectValue, `[${index}][${expectKey}] is ${actualValue}`);
        });
      });

      await Promise.all([
        database.executeFiles(testDataDir, ["delivery-places-teardown.sql"])
      ]);
    });
});