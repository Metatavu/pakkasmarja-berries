import config from "./config";
import * as test from "blue-tape"; 
import * as request from "supertest";
import auth from "./auth";
import database from "./database";
import TestConfig from "./test-config";

const testDataDir = `${__dirname}/../../src/test/data/`;

test("Test listing opening hour periods", async (t) => {
  await database.executeFile(testDataDir, "opening-hours-setup.sql");

  return request(TestConfig.HOST)
    .get(`/rest/v1/openingHours/bad02318-1a44-11e8-87a4-c7808d590a07/periods?rangeStart=2020-01-02&rangeEnd=2020-02-05`)
    .set("Authorization", `Bearer ${await auth.getTokenUser1()}`)
    .set("Accept", "application/json")
    .expect(200)
    .then(async response => {
      t.comment("response received.");

      t.equal(response.body.length, 2, "Periods length match");
      t.equal(response.body[1].beginDate, '2020-01-01T00:00:00.000Z', "First period begin date");
      t.equal(response.body[1].endDate, '2020-01-31T00:00:00.000Z', "First period begin date");

      await database.executeFile(testDataDir, "opening-hours-teardown.sql");
    });
});

test("Test listing opening hour exceptions", async (t) => {
  await database.executeFile(testDataDir, "opening-hours-setup.sql");

  return request(TestConfig.HOST)
    .get(`/rest/v1/openingHours/bad02318-1a44-11e8-87a4-c7808d590a07/exceptions`)
    .set("Authorization", `Bearer ${await auth.getTokenUser1()}`)
    .set("Accept", "application/json")
    .expect(200)
    .then(async response => {
      t.comment("response received.");
      t.equal(response.body.length, 2, "Exceptions length match");
      t.equal(response.body[0].exceptionDate, '2020-01-15', "First exception date");

      await database.executeFile(testDataDir, "opening-hours-teardown.sql");
    });
});

test("Test listing all opening hour periods", async (t) => {
  await database.executeFile(testDataDir, "opening-hours-setup.sql");

  return request(TestConfig.HOST)
    .get("/rest/v1/openingHours/bad02318-1a44-11e8-87a4-c7808d590a07/periods")
    .set("Authorization", `Bearer ${await auth.getTokenUser1()}`)
    .set("Accept", "application/json")
    .expect(200)
    .then(async response => {
      const periods = response.body;
      t.equal(periods.length, 2, "Periods length match");

      t.equal(periods[1].beginDate, '2020-01-01T00:00:00.000Z', "First period begin date");
      t.equal(periods[1].endDate, '2020-01-31T00:00:00.000Z', "First period end date");

      await database.executeFile(testDataDir, "opening-hours-teardown.sql");
    });
});

test("Test finding last active opening hour", async (t) => {
  await database.executeFile(testDataDir, "opening-hours-setup.sql");

  return request(TestConfig.HOST)
    .get("/rest/v1/openingHours/bad02318-1a44-11e8-87a4-c7808d590a07/periods")
    .set("Authorization", `Bearer ${await auth.getTokenUser1()}`)
    .set("Accept", "application/json")
    .expect(200)
    .then(async response => {
      const periods = response.body;
      t.equal(periods.length, 2, "Periods length match");

      t.equal(periods[1].beginDate, '2020-01-01T00:00:00.000Z', "First period begin date");
      t.equal(periods[1].endDate, '2020-01-31T00:00:00.000Z', "First period end date");

      await database.executeFile(testDataDir, "opening-hours-teardown.sql");
    });
});

test("Test finding opening hour period", async (t) => {
  await database.executeFile(testDataDir, "opening-hours-setup.sql");

  return request(TestConfig.HOST)
    .get("/rest/v1/openingHours/bad02318-1a44-11e8-87a4-c7808d590a07/periods?maxResults=1")
    .set("Authorization", `Bearer ${await auth.getTokenUser1()}`)
    .set("Accept", "application/json")
    .expect(200)
    .then(async response => {
      const periods = response.body;
      t.equal(periods.length, 1, "Periods length match");

      t.equal(periods[0].beginDate, '2020-02-01T00:00:00.000Z', "Last active period begin date");
      t.equal(periods[0].endDate, '2020-02-15T00:00:00.000Z', "Last active end date");
      await database.executeFile(testDataDir, "opening-hours-teardown.sql");
    });
});