import * as test from "blue-tape"; 
import * as request from "supertest";
import auth from "./auth";
import database from "./database";

const testDataDir = `${__dirname}/../../src/test/data/`;
const openingHoursExpectedData = require(`${testDataDir}/opening-hours.json`);

test("Test listing opening hours", async (t) => {
  await database.executeFile(testDataDir, "opening-hours-setup.sql");

  return request("http://localhost:3002")
    .get(`/rest/v1/openingHours/bad02318-1a44-11e8-87a4-c7808d590a07?until=${new Date().toISOString()}`)
    .set("Authorization", `Bearer ${await auth.getTokenUser1()}`)
    .set("Accept", "application/json")
    .expect(200)
    .then(async response => {
      t.comment("response received.");
      t.equal(response.body.periods.length, 2, "Periods length match");
      t.equal(response.body.exceptions.length, 2, "Exceptions length match");

      t.comment(response.body.periods[0]);
      t.comment(response.body.periods[1]);
      t.comment(response.body.exceptions[0]);
      t.comment(response.body.exceptions[1]);

      await database.executeFile(testDataDir, "opening-hours-teardown.sql");
    });
});

test("Test listing opening hour periods", async (t) => {
  await database.executeFile(testDataDir, "opening-hours-setup.sql");

  return request("http://localhost:3002")
    .get("/rest/v1/openingHours/bad02318-1a44-11e8-87a4-c7808d590a07/periods")
    .set("Accept", "application/json")
    .expect(200)
    .then(async response => {
      const { periods } = response.body;
      t.equal(periods.length, 2, "Periods length match");

      t.comment(response.body.periods[0]);
      t.comment(response.body.periods[1]);

      await database.executeFile(testDataDir, "opening-hours-teardown.sql");
    });
});

// test("Test finding opening hour period", async (t) => {
//   await database.executeFile(testDataDir, "opening-hours-setup.sql");

//   return request("http://localhost:3002")
//   .get("/rest/v1/deliveryPlaces/440ba119-39c7-408e-ad51-ad946fb61e08")
//   .set("Accept", "application/json")
//   .expect(200)
//   .then(async response => {
//     await database.executeFile(testDataDir, "opening-hours-teardown.sql");
//   });
// });