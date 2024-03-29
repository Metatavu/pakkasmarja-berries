import * as test from "blue-tape";
import * as request from "supertest";
import auth from "./auth";
import database from "./database";
import ApplicationRoles from "../rest/application-roles";
import TestConfig from "./test-config";

const testDataDir = `${__dirname}/../../src/test/data/`;
const operationReportDatas = require(`${testDataDir}/operation-reports.json`);
const operationReportItemDatas = require(`${testDataDir}/operation-report-items.json`);

test("Test listing operation reports", async (t) => {
  await database.executeFiles(testDataDir, ["operation-reports-teardown.sql", "operation-reports-setup.sql"]);

  return request(TestConfig.HOST)
    .get("/rest/v1/operationreports")
    .set("Authorization", `Bearer ${await auth.getTokenUser1(ApplicationRoles.LIST_OPERATION_REPORTS)}`)
    .set("Accept", "application/json")
    .expect(200)
    .then(async response => {
      await auth.removeUser1Roles(ApplicationRoles.LIST_OPERATION_REPORTS);
      t.equal(response.body.length, 2);
      t.deepEqual(response.body[0], operationReportDatas["2aae1d5d-0230-47b2-bf9a-968828a6e6a0"]);
      t.deepEqual(response.body[1], operationReportDatas["8d74dde0-e624-4397-8563-c13ba9c4803e"]);

      await database.executeFiles(testDataDir, ["operation-reports-teardown.sql"]);
    });
});

test("Test listing operation reports - sort created asc", async (t) => {
  await database.executeFiles(testDataDir, ["operation-reports-teardown.sql", "operation-reports-setup.sql"]);

  return request(TestConfig.HOST)
    .get("/rest/v1/operationreports?sortBy=CREATED&sortDir=ASC")
    .set("Authorization", `Bearer ${await auth.getTokenUser1(ApplicationRoles.LIST_OPERATION_REPORTS)}`)
    .set("Accept", "application/json")
    .expect(200)
    .then(async response => {
      await auth.removeUser1Roles(ApplicationRoles.LIST_OPERATION_REPORTS);
      t.equal(response.body.length, 2);
      t.deepEqual(response.body[0], operationReportDatas["8d74dde0-e624-4397-8563-c13ba9c4803e"]);
      t.deepEqual(response.body[1], operationReportDatas["2aae1d5d-0230-47b2-bf9a-968828a6e6a0"]);

      await database.executeFiles(testDataDir, ["operation-reports-teardown.sql"]);
    });
});

test("Test listing operation reports - firstResult", async (t) => {
  await database.executeFiles(testDataDir, ["operation-reports-teardown.sql", "operation-reports-setup.sql"]);

  return request(TestConfig.HOST)
    .get("/rest/v1/operationreports?firstResult=1")
    .set("Authorization", `Bearer ${await auth.getTokenUser1(ApplicationRoles.LIST_OPERATION_REPORTS)}`)
    .set("Accept", "application/json")
    .expect(200)
    .then(async response => {
      await auth.removeUser1Roles(ApplicationRoles.LIST_OPERATION_REPORTS);
      t.equal(response.body.length, 1);
      t.deepEqual(response.body[0], operationReportDatas["8d74dde0-e624-4397-8563-c13ba9c4803e"]);

      await database.executeFiles(testDataDir, ["operation-reports-teardown.sql"]);
    });
});

test("Test listing operation reports - maxResults", async (t) => {
  await database.executeFiles(testDataDir, ["operation-reports-teardown.sql", "operation-reports-setup.sql"]);

  return request(TestConfig.HOST)
    .get("/rest/v1/operationreports?maxResults=1")
    .set("Authorization", `Bearer ${await auth.getTokenUser1(ApplicationRoles.LIST_OPERATION_REPORTS)}`)
    .set("Accept", "application/json")
    .expect(200)
    .then(async response => {
      await auth.removeUser1Roles(ApplicationRoles.LIST_OPERATION_REPORTS);
      t.equal(response.body.length, 1);
      t.deepEqual(response.body[0], operationReportDatas["2aae1d5d-0230-47b2-bf9a-968828a6e6a0"]);

      await database.executeFiles(testDataDir, ["operation-reports-teardown.sql"]);
    });
});

test("Test listing operation reports - without token", async () => {
  return request(TestConfig.HOST)
    .get("/rest/v1/operationreports")
    .set("Accept", "application/json")
    .expect(403)
    .then(() => {});
});

test("Test listing operation reports - invalid token", async () => {
  return request(TestConfig.HOST)
    .get("/rest/v1/operationreports")
    .set("Authorization", "Bearer FAKE")
    .set("Accept", "application/json")
    .expect(403)
    .then(() => {});
});

test("Test find operation report", async (t) => {
  await database.executeFiles(testDataDir, ["operation-reports-teardown.sql", "operation-reports-setup.sql"]);

  return request(TestConfig.HOST)
    .get("/rest/v1/operationreports/8d74dde0-e624-4397-8563-c13ba9c4803e")
    .set("Authorization", `Bearer ${await auth.getTokenUser1(ApplicationRoles.LIST_OPERATION_REPORTS)}`)
    .set("Accept", "application/json")
    .expect(200)
    .then(async response => {
      await auth.removeUser1Roles(ApplicationRoles.LIST_OPERATION_REPORTS);
      t.deepEqual(response.body, operationReportDatas["8d74dde0-e624-4397-8563-c13ba9c4803e"]);

      await database.executeFiles(testDataDir, ["operation-reports-teardown.sql"]);
    });
});

test("Test find operation report - without token", async () => {
  return request(TestConfig.HOST)
    .get("/rest/v1/operationreports/8d74dde0-e624-4397-8563-c13ba9c4803e")
    .set("Accept", "application/json")
    .expect(403)
    .then(() => {});
});

test("Test find operation report - invalid token", async () => {
  return request(TestConfig.HOST)
    .get("/rest/v1/operationreports/8d74dde0-e624-4397-8563-c13ba9c4803e")
    .set("Authorization", "Bearer FAKE")
    .set("Accept", "application/json")
    .expect(403)
    .then(() => {});
});

test("Test find operation report - not found", async () => {
  return request(TestConfig.HOST)
    .get("/rest/v1/operationreports/8d74dde0-e624-4397-8563-c13ba9c4803e")
    .set("Authorization", `Bearer ${await auth.getTokenUser1(ApplicationRoles.LIST_OPERATION_REPORTS)}`)
    .set("Accept", "application/json")
    .expect(404)
    .then(async () => {
      await auth.removeUser1Roles(ApplicationRoles.LIST_OPERATION_REPORTS);
    });
});

test("Test find operation report - invalid id", async () => {
  return request(TestConfig.HOST)
    .get("/rest/v1/operationreports/not-uuid")
    .set("Authorization", `Bearer ${await auth.getTokenUser1(ApplicationRoles.LIST_OPERATION_REPORTS)}`)
    .set("Accept", "application/json")
    .then(async () => {
      await auth.removeUser1Roles(ApplicationRoles.LIST_OPERATION_REPORTS);
    });
});

test("Test listing operation report items", async (t) => {
  await database.executeFiles(testDataDir, ["operation-reports-teardown.sql", "operation-reports-setup.sql"]);

  return request(TestConfig.HOST)
    .get("/rest/v1/operationreports/8d74dde0-e624-4397-8563-c13ba9c4803e/items")
    .set("Authorization", `Bearer ${await auth.getTokenUser1(ApplicationRoles.LIST_OPERATION_REPORTS)}`)
    .set("Accept", "application/json")
    .expect(200)
    .then(async response => {
      await auth.removeUser1Roles(ApplicationRoles.LIST_OPERATION_REPORTS);
      t.equal(response.body.length, 2);
      t.deepEqual(response.body, operationReportItemDatas["8d74dde0-e624-4397-8563-c13ba9c4803e"]);
      await database.executeFiles(testDataDir, ["operation-reports-teardown.sql"]);
    });
});