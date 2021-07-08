import * as test from "blue-tape"; 
import * as request from "supertest";
import * as moment from "moment";
import * as cheerio from "cheerio";
import auth from "./auth";
import database from "./database";
import operations from "./operations";
import ApplicationRoles from "../rest/application-roles";
import push from "./push";
import pdf from "./pdf";
import xlsx from "./xlsx";
import users from "./users";
import requestUtils from "./request-utils";
import TestConfig from "./test-config";
import sapWireMockTestClient from "./wiremock-test-client";

const testDataDir = `${__dirname}/../../src/test/data/`;
const contractDatas = require(`${testDataDir}/contracts.json`);
const contractsImport = require(`${testDataDir}/contracts-import.json`);
const contractsImportFalseData = require(`${testDataDir}/contracts-import-false-data.json`);
const contractDatasSync = require(`${testDataDir}/contracts-sync.json`);
const contractDataCreate = require(`${testDataDir}/contracts-create.json`);
const contractSapCreate = require(`${testDataDir}/contract-sap-create.json`);
const contractDatasUpdate = require(`${testDataDir}/contracts-update.json`);
const contractExcelSingle = require(`${testDataDir}/contract-xlsx-single.json`);
const contractExcelMultiple = require(`${testDataDir}/contract-xlsx-multiple.json`);
const contractDocumentTemplateDatas = require(`${testDataDir}/contract-document-templates.json`);
const contractDocumentTemplateUpdateDatas = require(`${testDataDir}/contract-document-templates-update.json`);
const contractDocumentTemplateCreateData = require(`${testDataDir}/contract-document-templates-create.json`);
const itemGroupPriceDatas = require(`${testDataDir}/item-group-prices.json`);
const contractUpdatePushNotifications = require(`${testDataDir}/contract-update-push-notifications.json`);
const contractCreatePushNotifications = require(`${testDataDir}/contract-create-push-notifications.json`);

test("Test contract sign", async () => {
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql", "contract-documents-setup.sql", "item-groups-prices-setup.sql"]);

  return request(TestConfig.HOST)
    .post("/rest/v1/contracts/3950f496-0fba-11e8-9611-0b2da5ab56ce/documents/group/signRequests")
    .set("Authorization", `Bearer ${await auth.getTokenUser2()}`)
    .set("Accept", "application/json")
    .send({
      "redirectUrl": "http://fake.exmaple.com/redirect"
    })
    .expect(200)
    .then(async () => {
      await database.executeFiles(testDataDir, ["item-groups-prices-teardown.sql", "contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
    });
});

test("Test contract sign - missing prerequisite", async (t) => {
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql", "contract-documents-setup.sql", "item-groups-prices-setup.sql", "item-groups-prerequisite-setup.sql"]);

  return request(TestConfig.HOST)
    .post("/rest/v1/contracts/3950f496-0fba-11e8-9611-0b2da5ab56ce/documents/group/signRequests")
    .set("Authorization", `Bearer ${await auth.getTokenUser2()}`)
    .set("Accept", "application/json")
    .send({
      "redirectUrl": "http://fake.exmaple.com/redirect"
    })
    .expect(400)
    .then(async response => {
      await database.executeFiles(testDataDir, ["item-groups-prerequisite-teardown.sql", "item-groups-prices-teardown.sql", "contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      t.deepEqual(response.body, {
        "code": 400,
        "message": "Missing prerequisite contracts" 
      });
    });
});

test("Test importing contracts", async (t) => {
  await database.executeFiles(testDataDir, [ "delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql" ]);
  return request(TestConfig.HOST)
    .post("/rest/v1/contractPreviews")
    .set("Content-Type", "application/x-www-form-urlencoded")
    .set("Authorization", `Bearer ${await auth.getTokenUser1([ ApplicationRoles.CREATE_CONTRACT ])}`)
    .set("Accept", "application/json")
    .attach('file', `${testDataDir}contracts-import.xlsx`)
    .expect(200)
    .then(async response => {
      await auth.removeUser1Roles([ ApplicationRoles.CREATE_CONTRACT ]);
      await database.executeFiles(testDataDir, ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      t.deepEqual(response.body, contractsImport, "response data is equal to validation data");
    });
});

test("Test importing contracts - forbidden", async (t) => {
  await database.executeFiles(testDataDir, [ "delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql" ]);
  return request(TestConfig.HOST)
    .post("/rest/v1/contractPreviews")
    .set("Content-Type", "application/x-www-form-urlencoded")
    .set("Authorization", `Bearer ${await auth.getTokenUser1()}`)
    .set("Accept", "application/json")
    .attach('file', `${testDataDir}contracts-import.xlsx`)
    .expect(403)
    .then(async () => {
      await database.executeFiles(testDataDir, ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
    });
});

test("Test importing contracts - no file", async (t) => {
  await database.executeFiles(testDataDir, [ "delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql" ]);
  return request(TestConfig.HOST)
    .post("/rest/v1/contractPreviews")
    .set("Content-Type", "application/x-www-form-urlencoded")
    .set("Authorization", `Bearer ${await auth.getTokenUser1([ ApplicationRoles.CREATE_CONTRACT ])}`)
    .set("Accept", "application/json")
    .expect(400)
    .then(async () => {
      await auth.removeUser1Roles([ ApplicationRoles.CREATE_CONTRACT ]);
      await database.executeFiles(testDataDir, ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
    });
});

test("Test importing contracts - no data rows in file", async (t) => {
  await database.executeFiles(testDataDir, [ "delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql" ]);
  return request(TestConfig.HOST)
    .post("/rest/v1/contractPreviews")
    .set("Content-Type", "application/x-www-form-urlencoded")
    .set("Authorization", `Bearer ${await auth.getTokenUser1([ ApplicationRoles.CREATE_CONTRACT ])}`)
    .set("Accept", "application/json")
    .attach('file', `${testDataDir}contracts-import-empty.xlsx`)
    .expect(400)
    .then(async () => {
      await auth.removeUser1Roles([ ApplicationRoles.CREATE_CONTRACT ]);
      await database.executeFiles(testDataDir, ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
    });
});

test("Test importing contracts - false data", async (t) => {
  await database.executeFiles(testDataDir, [ "delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql" ]);
  return request(TestConfig.HOST)
    .post("/rest/v1/contractPreviews")
    .set("Content-Type", "application/x-www-form-urlencoded")
    .set("Authorization", `Bearer ${await auth.getTokenUser1([ ApplicationRoles.CREATE_CONTRACT ])}`)
    .set("Accept", "application/json")
    .attach('file', `${testDataDir}contracts-import-false-data.xlsx`)
    .expect(200)
    .then(async response => {
      await auth.removeUser1Roles([ ApplicationRoles.CREATE_CONTRACT ]);
      await database.executeFiles(testDataDir, ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      t.deepEqual(response.body, contractsImportFalseData, "response data is equal to validation data");
    });
});

test("Test creating contracts", async (t) => {
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);
  push.clearOutbox();
  return request(TestConfig.HOST)
    .post("/rest/v1/contracts")
    .set("Authorization", `Bearer ${await auth.getTokenUser1([ApplicationRoles.CREATE_CONTRACT])}`)
    .set("Accept", "application/json")
    .send(contractDataCreate)
    .expect(200)
    .then(async response => {
      await auth.removeUser1Roles([ApplicationRoles.CREATE_CONTRACT]);
      await database.executeFiles(testDataDir, ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      t.deepEqual(push.getOutbox(), contractCreatePushNotifications);
      
      Object.keys(contractDataCreate).forEach((expectKey) => {
        const expectValue = contractDataCreate[expectKey];
        const actualValue = response.body[expectKey];
        t.deepEqual(expectValue, actualValue, `[${expectKey}] is ${actualValue}`);
      });
    });
});

test("Test creating contract to SAP", async (t) => {
  await database.executeFiles(testDataDir, [ "delivery-places-setup.sql", "item-groups-setup.sql", "products-setup.sql", "contracts-setup.sql" ]);
  push.clearOutbox();
  await sapWireMockTestClient.empty();

  await request(TestConfig.HOST)
    .post("/rest/v1/contracts")
    .set("Authorization", `Bearer ${await auth.getTokenUser1([ ApplicationRoles.CREATE_CONTRACT, ApplicationRoles.UPDATE_OTHER_CONTRACTS ])}`)
    .set("Accept", "application/json")
    .send(contractSapCreate)
    .expect(200)
    .then(async () => {
      t.equal(await sapWireMockTestClient.verify("POST", "/BlanketAgreements"), 1, "Create SAP contract request found");
    }).finally(async () => {
      await auth.removeUser1Roles([ ApplicationRoles.CREATE_CONTRACT, ApplicationRoles.UPDATE_OTHER_CONTRACTS ]);
      await database.executeFiles(testDataDir, [ "contracts-teardown.sql", "products-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql" ]);
      await sapWireMockTestClient.empty();
      push.clearOutbox();
    });
});

test("Test listing contracts - xlsx all", async (t) => {
  await users.resetUsers(["6f1cd486-107e-404c-a73f-50cc1fdabdd6", "677e99fd-b854-479f-afa6-74f295052770"], t);
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);

  return request(TestConfig.HOST)
    .get("/rest/v1/contracts?listAll=true")
    .set("Authorization", `Bearer ${await auth.getTokenUser1([ApplicationRoles.LIST_ALL_CONTRACTS])}`)
    .set("Accept", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    .expect(200)
    .parse(requestUtils.createBinaryParser())
    .then(async response => {
      await auth.removeUser1Roles([ApplicationRoles.LIST_ALL_CONTRACTS]);
      await database.executeFiles(testDataDir, ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      const xlsxJson = xlsx.parseXlsx(response.body);
      t.equal(response.type, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      t.deepEqual(xlsxJson, contractExcelMultiple);
    });
});

test("Test listing contracts - xlsx single", async (t) => {
  await users.resetUsers(["6f1cd486-107e-404c-a73f-50cc1fdabdd6", "677e99fd-b854-479f-afa6-74f295052770"], t);
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);

  return request(TestConfig.HOST)
    .get("/rest/v1/contracts")
    .set("Authorization", `Bearer ${await auth.getTokenUser1()}`)
    .set("Accept", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    .expect(200)
    .parse(requestUtils.createBinaryParser())
    .then(async response => {
      await database.executeFiles(testDataDir, ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      const xlsxJson = xlsx.parseXlsx(response.body);
      t.equal(response.type, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      t.deepEqual(contractExcelSingle, xlsxJson);
    });
});

test("Test list contracts", async (t) => {
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);

  return request(TestConfig.HOST)
    .get("/rest/v1/contracts")
    .set("Authorization", `Bearer ${await auth.getTokenUser1()}`)
    .set("Accept", "application/json")
    .expect(200)
    .then(async response => {
      t.equal(response.body.length, 1);
      t.deepEqual(response.body[0], contractDatas["1d45568e-0fba-11e8-9ac4-a700da67a976"]);
      await database.executeFiles(testDataDir, ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
    });
});

test("Test list contracts - accept with parameters", async (t) => {
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);

  return request(TestConfig.HOST)
    .get("/rest/v1/contracts")
    .set("Authorization", `Bearer ${await auth.getTokenUser1()}`)
    .set("Accept", "application/json;charset=utf8")
    .expect(200)
    .then(async response => {
      t.equal(response.body.length, 1);
      t.deepEqual(response.body[0], contractDatas["1d45568e-0fba-11e8-9ac4-a700da67a976"]);
      await database.executeFiles(testDataDir, ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
    });
});

test("Test list contracts - all", async (t) => {
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);

  return request(TestConfig.HOST)
    .get("/rest/v1/contracts?listAll=true")
    .set("Authorization", `Bearer ${await auth.getTokenUser1([ApplicationRoles.LIST_ALL_CONTRACTS])}`)
    .set("Accept", "application/json")
    .expect(200)
    .then(async response => {
      await auth.removeUser1Roles([ApplicationRoles.LIST_ALL_CONTRACTS]);
      t.equal(response.body.length, 2);
      t.deepEqual(response.body[0], contractDatas["1d45568e-0fba-11e8-9ac4-a700da67a976"]);
      t.deepEqual(response.body[1], contractDatas["3950f496-0fba-11e8-9611-0b2da5ab56ce"]);
      await database.executeFiles(testDataDir, ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
    });
});

test("Test list contracts - item group category - all", async (t) => {
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);

  return request(TestConfig.HOST)
    .get("/rest/v1/contracts?listAll=true&itemGroupCategory=FRESH")
    .set("Authorization", `Bearer ${await auth.getTokenUser1([ApplicationRoles.LIST_ALL_CONTRACTS])}`)
    .set("Accept", "application/json")
    .expect(200)
    .then(async response => {
      await auth.removeUser1Roles([ApplicationRoles.LIST_ALL_CONTRACTS]);
      t.equal(response.body.length, 1);
      t.deepEqual(response.body[0], contractDatas["3950f496-0fba-11e8-9611-0b2da5ab56ce"]);
      await database.executeFiles(testDataDir, ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
    });
});

test("Test list contracts - item group category - user", async (t) => {
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);

  return request(TestConfig.HOST)
    .get("/rest/v1/contracts?itemGroupCategory=FROZEN")
    .set("Authorization", `Bearer ${await auth.getTokenUser1()}`)
    .set("Accept", "application/json")
    .expect(200)
    .then(async response => {
      t.equal(response.body.length, 1);
      t.deepEqual(response.body[0], contractDatas["1d45568e-0fba-11e8-9ac4-a700da67a976"]);
      await database.executeFiles(testDataDir, ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
    });
});

test("Test listing all contracts - forbidden", async () => {
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);

  return request(TestConfig.HOST)
    .get("/rest/v1/contracts?listAll=true")
    .set("Authorization", `Bearer ${await auth.getTokenUser1()}`)
    .set("Accept", "application/json")
    .expect(403)
    .then(async () => {
      await database.executeFiles(testDataDir, ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
    });
});

test("Test listing contracts - without token", async () => {
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);

  return request(TestConfig.HOST)
    .get("/rest/v1/contracts")
    .set("Accept", "application/json")
    .expect(403)
    .then(async response => {
      await database.executeFiles(testDataDir, ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
    });
});

test("Test listing contracts - invalid token", async () => {
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);

  return request(TestConfig.HOST)
    .get("/rest/v1/contracts")
    .set("Authorization", "Bearer FAKE")
    .set("Accept", "application/json")
    .expect(403)
    .then(async response => {
      await database.executeFiles(testDataDir, ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
    });
});

test("Test finding contracts", async (t) => {
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);
  
  return request(TestConfig.HOST)
    .get("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976")
    .set("Authorization", `Bearer ${await auth.getTokenUser1()}`)
    .set("Accept", "application/json")
    .expect(200)
    .then(async response => {
      await database.executeFiles(testDataDir, ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      t.deepEqual(response.body, contractDatas["1d45568e-0fba-11e8-9ac4-a700da67a976"]);
    });
});

test("Test finding contracts - without token", async () => {
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);
  
  return request(TestConfig.HOST)
    .get("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976")
    .set("Accept", "application/json")
    .expect(403)
    .then(async response => {
      await database.executeFiles(testDataDir, ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
    });
});

test("Test finding contracts - invalid token", async () => {
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);
  
  return request(TestConfig.HOST)
    .get("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976")
    .set("Authorization", "Bearer FAKE")
    .set("Accept", "application/json")
    .expect(403)
    .then(async response => {
      await database.executeFiles(testDataDir, ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
    });
});

test("Test finding contract - not found", async () => {
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);
  
  return request(TestConfig.HOST)
    .get("/rest/v1/contracts/c74e5468-0fb1-11e8-a4e2-87868e24ee8b")
    .set("Authorization", `Bearer ${await auth.getTokenUser1([ApplicationRoles.LIST_ALL_CONTRACTS])}`)
    .set("Accept", "application/json")
    .expect(404)
    .then(async response => {
      await auth.removeUser1Roles([ApplicationRoles.LIST_ALL_CONTRACTS]);
      await database.executeFiles(testDataDir, ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
    });
});

test("Test finding contract - malformed id", async () => {
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);
  
  return request(TestConfig.HOST)
    .get("/rest/v1/contracts/not-uuid")
    .set("Authorization", `Bearer ${await auth.getTokenUser1([ApplicationRoles.LIST_ALL_CONTRACTS])}`)
    .set("Accept", "application/json")
    .expect(404)
    .then(async response => {
      await auth.removeUser1Roles([ApplicationRoles.LIST_ALL_CONTRACTS]);
      await database.executeFiles(testDataDir, ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
    });
});

test("Test contract pdf", async (t) => {
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql", "contract-documents-setup.sql", "item-groups-prices-setup.sql"]);
  return request(TestConfig.HOST)
    .get("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976/documents/master?format=PDF")
    .set("Authorization", `Bearer ${await auth.getTokenUser1()}`)
    .set("Accept", "application/json")
    .expect(200)
    .then(async response => {
      await database.executeFiles(testDataDir, ["item-groups-prices-teardown.sql", "contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      await pdf.extractPdfDataFromBuffer(response.body)
        .then((pdfData: any) => {
          t.ok(pdfData.rawTextContent.indexOf("Contract is draft") > -1, "Contains is draft text");
          t.ok(pdfData.rawTextContent.indexOf("Test 1") > -1, "Contains first name");
          t.ok(pdfData.rawTextContent.indexOf("User 1") > -1, "Contains last name");
          t.ok(pdfData.rawTextContent.indexOf(moment().locale("fi").format("L")) > -1, "Contains today");
          t.ok(pdfData.rawTextContent.indexOf("1 (1)") > -1, "Contains header page number");
          t.ok(pdfData.rawTextContent.indexOf("start 01.01.2020, end: 31.12.2020, sign: 14.12.2019, term 02.01.2020") > -1, "Contains dates");
          t.ok(pdfData.rawTextContent.indexOf("Example Co. (company in future)") > -1, "Contains replaced company name");
          t.ok(pdfData.rawTextContent.indexOf("Group 18.00 € / l") > -1, "Contains replaced price");
          t.ok(pdfData.rawTextContent.indexOf("https://www.example.com") > -1, "contains footer");
          t.ok(pdfData.rawTextContent.indexOf("Test Place 1") > -1, "contains replaced delivery place");
          t.ok(pdfData.rawTextContent.indexOf("1122334-4 - FI11223344") > -1, "Contains codes");
        });
    });
});

test("Test contract pdf - item group", async (t) => {
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql", "contract-documents-setup.sql"]);
  
  return request(TestConfig.HOST)
    .get("/rest/v1/contracts/3950f496-0fba-11e8-9611-0b2da5ab56ce/documents/group?format=PDF")
    .set("Authorization", `Bearer ${await auth.getTokenUser2()}`)
    .set("Accept", "application/json")
    .expect(200)
    .then(async response => {
      await database.executeFiles(testDataDir, ["contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      await pdf.extractPdfDataFromBuffer(response.body)
        .then((pdfData: any) => {
          t.ok(pdfData.rawTextContent.indexOf("Example group purchase contract") > -1, "Contains contents");
        });
    });
});

test("Test contract pdf - without token", async () => {
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);
  
  return request(TestConfig.HOST)
    .get("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976/documents/master?format=PDF")
    .set("Accept", "application/json")
    .expect(403)
    .then(async response => {
      await database.executeFiles(testDataDir, ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
    });
});

test("Test contract pdf - invalid token", async () => {
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);
  
  return request(TestConfig.HOST)
    .get("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976/documents/master?format=PDF")
    .set("Authorization", "Bearer FAKE")
    .set("Accept", "application/json")
    .expect(403)
    .then(async response => {
      await database.executeFiles(testDataDir, ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
    });
});

test("Test contract html", async (t) => {
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql", "contract-documents-setup.sql", "item-groups-prices-setup.sql"]);
  
  return request(TestConfig.HOST)
    .get("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976/documents/master?format=HTML")
    .set("Authorization", `Bearer ${await auth.getTokenUser1()}`)
    .set("Accept", "text/html")
    .expect(200)
    .then(async response => {
      await database.executeFiles(testDataDir, ["item-groups-prices-teardown.sql", "contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      const $ = cheerio.load(response.text);
      
      t.equal("Example berry purchase contract", $("h1").text(), "Contains header");
      t.ok($("p").text().indexOf("Example Co. (company in future)") > -1, "Contains replaced company name");
      t.ok($("td").text().indexOf("Group") > -1, "Contains replaced price");
      t.ok($("td").text().indexOf("18.00 € / l") > -1, "Contains replaced price");
      t.ok($("p").text().indexOf("Test Place 1") > -1, "Contains replaced delivery place");
      t.ok($("p.dates").text().indexOf("start 01.01.2020, end: 31.12.2020, sign: 14.12.2019, term 02.01.2020") > -1, "Contains dates");
      t.ok($("p.businessCodes").text().indexOf("1122334-4 - FI11223344") > -1, "Contains codes");
      t.ok($("p.draft").text().indexOf("Contract is draft") > -1, "Contains is draft text");
      t.ok($("p.first").text().indexOf("Test 1") > -1, "Contains first name");
      t.ok($("p.last").text().indexOf("User 1") > -1, "Contains last name");
      t.ok($("p.today").text().indexOf(moment().locale("fi").format("L")) > -1, "Contains today");
    });
});

test("Test contract pdf - item group", async (t) => {
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql", "contract-documents-setup.sql"]);
  
  return request(TestConfig.HOST)
    .get("/rest/v1/contracts/3950f496-0fba-11e8-9611-0b2da5ab56ce/documents/group?format=HTML")
    .set("Authorization", `Bearer ${await auth.getTokenUser2()}`)
    .set("Accept", "text/html")
    .expect(200)
    .then(async response => {
      await database.executeFiles(testDataDir, ["contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      const $ = cheerio.load(response.text);
      t.ok($("p").text().indexOf("Test Corp. (company in future) and Example Co. (company in future).") > -1, "Contains contents");
    });
});

test("Test contract pdf - without token", async () => {
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);
  
  return request(TestConfig.HOST)
    .get("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976/documents/master?format=PDF")
    .set("Accept", "text/html")
    .expect(403)
    .then(async () => {
      await database.executeFiles(testDataDir, ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
    });
});

test("Test contract pdf - invalid token", async () => {
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);
  
  return request(TestConfig.HOST)
    .get("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976/documents/master?format=HTML")
    .set("Authorization", "Bearer FAKE")
    .set("Accept", "text/html")
    .expect(403)
    .then(async () => {
      await database.executeFiles(testDataDir, ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
    });
});

test("Test sync contracts", async (t) => {
  const adminAccessToken = await auth.getAdminToken();  
  
  await operations.createOperationAndWait(adminAccessToken, "SAP_CONTACT_SYNC");
  await operations.createOperationAndWait(adminAccessToken, "SAP_DELIVERY_PLACE_SYNC");
  await operations.createOperationAndWait(adminAccessToken, "SAP_ITEM_GROUP_SYNC");
  await operations.createOperationAndWait(adminAccessToken, "SAP_CONTRACT_SYNC");
  
  return request(TestConfig.HOST)
    .get("/rest/v1/contracts?listAll=true&maxResults=10")
    .set("Authorization", `Bearer ${await auth.getTokenUser1([ApplicationRoles.LIST_ALL_CONTRACTS])}`)
    .set("Accept", "application/json")
    .expect(200)
    .then(async response => {
      await auth.removeUser1Roles([ApplicationRoles.LIST_ALL_CONTRACTS]);
      await users.resetUsers(["6f1cd486-107e-404c-a73f-50cc1fdabdd6", "677e99fd-b854-479f-afa6-74f295052770"], t);
      await database.executeFiles(testDataDir, ["contracts-teardown.sql", "item-groups-teardown.sql", "operation-reports-teardown.sql"]);
      
      const actualContracts = response.body;
      actualContracts.sort((c1: any, c2: any) => {
        if (c1.year === c2.year) {
          return c1.contractQuantity - c2.contractQuantity;
        } else {
          return c2.year - c1.year;
        }
      });

      contractDatasSync.forEach((expectedContract: any, contractIndex: number) => {
        Object.keys(expectedContract).forEach((expectKey) => {
          const expectValue = expectedContract[expectKey];
          const actualValue = actualContracts[contractIndex][expectKey];
          t.deepEqual(actualValue, expectValue, `[${contractIndex}][${expectKey}] is ${actualValue}`);
        });
      });
    });
});

test("Test contract xlsx", async (t) => {
  await users.resetUsers(["6f1cd486-107e-404c-a73f-50cc1fdabdd6", "677e99fd-b854-479f-afa6-74f295052770"], t);
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql", "contract-documents-setup.sql"]);
  
  return request(TestConfig.HOST)
    .get("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976")
    .set("Authorization", `Bearer ${await auth.getTokenUser1()}`)
    .set("Accept", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    .expect(200)
    .parse(requestUtils.createBinaryParser())
    .then(async response => {
      await database.executeFiles(testDataDir, ["contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      const xlsxJson = xlsx.parseXlsx(response.body);
      t.equal(response.type, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      t.deepEqual(xlsxJson, contractExcelSingle);
    });
});

test("Test contract xlsx - invalid format", async () => {
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql", "contract-documents-setup.sql"]);
  
  return request(TestConfig.HOST)
    .get("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976")
    .set("Authorization", `Bearer ${await auth.getTokenUser1()}`)
    .set("Accept", "application/xml")
    .expect(400)
    .then(async () => {
      await database.executeFiles(testDataDir, ["contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
    });
});

test("Test contract xlsx - without token", async () => {
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);
  
  return request(TestConfig.HOST)
    .get("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976")
    .set("Accept", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    .expect(403)
    .then(async () => {
      await database.executeFiles(testDataDir, ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
    });
});

test("Test updating contracts", async (t) => {
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);
  push.clearOutbox();
  return request(TestConfig.HOST)
    .put("/rest/v1/contracts/3950f496-0fba-11e8-9611-0b2da5ab56ce")
    .set("Authorization", `Bearer ${await auth.getTokenUser2()}`)
    .set("Accept", "application/json")
    .send(contractDatasUpdate["3950f496-0fba-11e8-9611-0b2da5ab56ce"])
    .expect(200)
    .then(async response => {
      await database.executeFiles(testDataDir, ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      t.deepEqual(response.body, contractDatasUpdate["3950f496-0fba-11e8-9611-0b2da5ab56ce"]);
      t.deepEqual(push.getOutbox(), contractUpdatePushNotifications);
    });
});

test("Test find contract document template", async (t) => {
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql", "contract-documents-setup.sql"]);
  
  return request(TestConfig.HOST)
    .get("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976/documentTemplates/2ba4ace6-2227-11e8-8cd7-ef6b34e82618")
    .set("Authorization", `Bearer ${await auth.getTokenUser1([ApplicationRoles.LIST_CONTRACT_DOCUMENT_TEMPLATES])}`)
    .set("Accept", "application/json")
    .expect(200)
    .then(async response => {
      await auth.removeUser1Roles([ApplicationRoles.LIST_CONTRACT_DOCUMENT_TEMPLATES]);
      await database.executeFiles(testDataDir, ["contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      t.deepEqual(response.body, contractDocumentTemplateDatas["2ba4ace6-2227-11e8-8cd7-ef6b34e82618"]);
    });
});

test("Test find contract document template - incorrect contract", async () => {
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql", "contract-documents-setup.sql"]);
  
  return request(TestConfig.HOST)
    .get("/rest/v1/contracts/89723408-0f51-11e8-baa0-dfe7c7eae257/documentTemplates/2ba4ace6-2227-11e8-8cd7-ef6b34e82618")
    .set("Authorization", `Bearer ${await auth.getTokenUser1([ApplicationRoles.LIST_CONTRACT_DOCUMENT_TEMPLATES])}`)
    .set("Accept", "application/json")
    .expect(404)
    .then(async () => {
      await auth.removeUser1Roles([ApplicationRoles.LIST_CONTRACT_DOCUMENT_TEMPLATES]);
      await database.executeFiles(testDataDir, ["contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
    });
});

test("Test find contract document template - invalid contract", async () => {
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql", "contract-documents-setup.sql"]);
  
  return request(TestConfig.HOST)
    .get("/rest/v1/contracts/invalid/documentTemplates/2ba4ace6-2227-11e8-8cd7-ef6b34e82618")
    .set("Authorization", `Bearer ${await auth.getTokenUser1([ApplicationRoles.LIST_CONTRACT_DOCUMENT_TEMPLATES])}`)
    .set("Accept", "application/json")
    .expect(404)
    .then(async () => {
      await auth.removeUser1Roles([ApplicationRoles.LIST_CONTRACT_DOCUMENT_TEMPLATES]);
      await database.executeFiles(testDataDir, ["contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
    });
});

test("Test find contract document template - incorrect id", async () => {
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql", "contract-documents-setup.sql"]);
  
  return request(TestConfig.HOST)
    .get("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976/documentTemplates/2fe6ad72-2227-11e8-a5fd-efc457362c53")
    .set("Authorization", `Bearer ${await auth.getTokenUser1([ApplicationRoles.LIST_CONTRACT_DOCUMENT_TEMPLATES])}`)
    .set("Accept", "application/json")
    .expect(404)
    .then(async () => {
      await auth.removeUser1Roles([ApplicationRoles.LIST_CONTRACT_DOCUMENT_TEMPLATES]);
      await database.executeFiles(testDataDir, ["contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
    });
});

test("Test find contract document template - invalid id", async () => {
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql", "contract-documents-setup.sql"]);
  
  return request(TestConfig.HOST)
    .get("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976/documentTemplates/not-uuid")
    .set("Authorization", `Bearer ${await auth.getTokenUser1([ApplicationRoles.LIST_CONTRACT_DOCUMENT_TEMPLATES])}`)
    .set("Accept", "application/json")
    .expect(404)
    .then(async () => {
      await auth.removeUser1Roles([ApplicationRoles.LIST_CONTRACT_DOCUMENT_TEMPLATES]);
      await database.executeFiles(testDataDir, ["contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
    });
});

test("Test list contract document templates", async (t) => {
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql", "contract-documents-setup.sql"]);
  
  return request(TestConfig.HOST)
    .get("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976/documentTemplates")
    .set("Authorization", `Bearer ${await auth.getTokenUser1([ApplicationRoles.LIST_CONTRACT_DOCUMENT_TEMPLATES])}`)
    .set("Accept", "application/json")
    .expect(200)
    .then(async response => {
      await auth.removeUser1Roles([ApplicationRoles.LIST_CONTRACT_DOCUMENT_TEMPLATES]);
      await database.executeFiles(testDataDir, ["contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      t.equal(response.body.length, 1);
      t.deepEqual(response.body[0], contractDocumentTemplateDatas["2ba4ace6-2227-11e8-8cd7-ef6b34e82618"]);
    });
});

test("Test list contract document templates - by type", async (t) => {
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql", "contract-documents-setup.sql"]);
  
  return request(TestConfig.HOST)
    .get("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976/documentTemplates?type=master")
    .set("Authorization", `Bearer ${await auth.getTokenUser1([ApplicationRoles.LIST_CONTRACT_DOCUMENT_TEMPLATES])}`)
    .set("Accept", "application/json")
    .expect(200)
    .then(async response => {
      await auth.removeUser1Roles([ApplicationRoles.LIST_CONTRACT_DOCUMENT_TEMPLATES]);
      await database.executeFiles(testDataDir, ["contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      t.equal(response.body.length, 1);
      t.deepEqual(response.body[0], contractDocumentTemplateDatas["2ba4ace6-2227-11e8-8cd7-ef6b34e82618"]);
    });
});

test("Test list contract document templates - by type - not found", async (t) => {
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql", "contract-documents-setup.sql"]);
  
  return request(TestConfig.HOST)
    .get("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976/documentTemplates?type=notfound")
    .set("Authorization", `Bearer ${await auth.getTokenUser1([ApplicationRoles.LIST_CONTRACT_DOCUMENT_TEMPLATES])}`)
    .set("Accept", "application/json")
    .expect(200)
    .then(async response => {
      await auth.removeUser1Roles([ApplicationRoles.LIST_CONTRACT_DOCUMENT_TEMPLATES]);
      await database.executeFiles(testDataDir, ["contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      t.equal(response.body.length, 0);
    });
});

test("Test update contract document template", async (t) => {
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql", "contract-documents-setup.sql"]);
  
  return request(TestConfig.HOST)
    .put("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976/documentTemplates/2ba4ace6-2227-11e8-8cd7-ef6b34e82618")
    .set("Authorization", `Bearer ${await auth.getTokenUser1([ApplicationRoles.UPDATE_CONTRACT_DOCUMENT_TEMPLATES])}`)
    .set("Accept", "application/json")
    .send(contractDocumentTemplateUpdateDatas["2ba4ace6-2227-11e8-8cd7-ef6b34e82618"])
    .expect(200)
    .then(async response => {
      await auth.removeUser1Roles([ApplicationRoles.UPDATE_CONTRACT_DOCUMENT_TEMPLATES]);
      await database.executeFiles(testDataDir, ["contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      t.deepEqual(response.body, contractDocumentTemplateUpdateDatas["2ba4ace6-2227-11e8-8cd7-ef6b34e82618"]);
    });
});

test("Test create contract document template", async (t) => {
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql", "contract-documents-setup.sql"]);
  
  return request(TestConfig.HOST)
    .post("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976/documentTemplates")
    .set("Authorization", `Bearer ${await auth.getTokenUser1([ApplicationRoles.CREATE_CONTRACT_DOCUMENT_TEMPLATES])}`)
    .set("Accept", "application/json")
    .send(contractDocumentTemplateCreateData)
    .expect(200)
    .then(async response => {
      await auth.removeUser1Roles([ApplicationRoles.CREATE_CONTRACT_DOCUMENT_TEMPLATES]);
      await database.executeFiles(testDataDir, ["contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      
      const expected = contractDocumentTemplateCreateData;
      Object.keys(expected).forEach((expectKey) => {
        const expectValue = expected[expectKey];
        const actualValue = response.body[expectKey];
        t.equal(actualValue, expectValue, `[${expectKey}] is ${actualValue}`);
      });
    });
});

test("Test listing item group prices", async (t) => {
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "item-groups-prices-setup.sql", "contracts-setup.sql"]);
  
  return request(TestConfig.HOST)
    .get("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976/prices")
    .set("Authorization", `Bearer ${await auth.getTokenUser1()}`)
    .set("Accept", "application/json")
    .expect(200)
    .then(async response => {
      await database.executeFiles(testDataDir, ["contracts-teardown.sql", "item-groups-prices-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      t.equal(response.body.length, 2);
      t.deepEqual(response.body[0], itemGroupPriceDatas["2cef70dc-3103-11e8-bc28-9b65ff9275bf"]);
      t.deepEqual(response.body[1], itemGroupPriceDatas["30685c88-3103-11e8-91df-87fa68b14005"]);
    });
});

test("Test listing item group prices - sort year desc", async (t) => {
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "item-groups-prices-setup.sql", "contracts-setup.sql"]);
  
  return request(TestConfig.HOST)
    .get("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976/prices?sortBy=YEAR&sortDir=DESC")
    .set("Authorization", `Bearer ${await auth.getTokenUser1()}`)
    .set("Accept", "application/json")
    .expect(200)
    .then(async response => {
      await database.executeFiles(testDataDir, ["contracts-teardown.sql", "item-groups-prices-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      t.equal(response.body.length, 2);
      t.deepEqual(response.body[0], itemGroupPriceDatas["30685c88-3103-11e8-91df-87fa68b14005"]);
      t.deepEqual(response.body[1], itemGroupPriceDatas["2cef70dc-3103-11e8-bc28-9b65ff9275bf"]);
    });
});

test("Test listing item group prices - sort year asc", async (t) => {
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "item-groups-prices-setup.sql", "contracts-setup.sql"]);
  
  return request(TestConfig.HOST)
    .get("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976/prices?sortBy=YEAR&sortDir=ASC")
    .set("Authorization", `Bearer ${await auth.getTokenUser1()}`)
    .set("Accept", "application/json")
    .expect(200)
    .then(async response => {
      await database.executeFiles(testDataDir, ["contracts-teardown.sql", "item-groups-prices-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      t.equal(response.body.length, 2);
      t.deepEqual(response.body[0], itemGroupPriceDatas["2cef70dc-3103-11e8-bc28-9b65ff9275bf"]);
      t.deepEqual(response.body[1], itemGroupPriceDatas["30685c88-3103-11e8-91df-87fa68b14005"]);
    });
});

test("Test listing item group prices - limit", async (t) => {
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "item-groups-prices-setup.sql", "contracts-setup.sql"]);
  
  return request(TestConfig.HOST)
    .get("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976/prices?sortBy=YEAR&sortDir=ASC&maxResults=1")
    .set("Authorization", `Bearer ${await auth.getTokenUser1()}`)
    .set("Accept", "application/json")
    .expect(200)
    .then(async response => {
      await database.executeFiles(testDataDir, ["contracts-teardown.sql", "item-groups-prices-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      t.equal(response.body.length, 1);
      t.deepEqual(response.body[0], itemGroupPriceDatas["2cef70dc-3103-11e8-bc28-9b65ff9275bf"]);
    });
});

test("Test listing item group prices - offset", async (t) => {
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "item-groups-prices-setup.sql", "contracts-setup.sql"]);
  
  return request(TestConfig.HOST)
    .get("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976/prices?sortBy=YEAR&sortDir=ASC&firstResult=1")
    .set("Authorization", `Bearer ${await auth.getTokenUser1()}`)
    .set("Accept", "application/json")
    .expect(200)
    .then(async response => {
      await database.executeFiles(testDataDir, ["contracts-teardown.sql", "item-groups-prices-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      t.equal(response.body.length, 1);
      t.deepEqual(response.body[0], itemGroupPriceDatas["30685c88-3103-11e8-91df-87fa68b14005"]);
    });
});

test("Test listing item group prices - incorrect item group", async () => {
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "item-groups-prices-setup.sql", "contracts-setup.sql"]);
  
  return request(TestConfig.HOST)
    .get("/rest/v1/contracts/12345678-0fba-11e8-9ac4-a700da67a976/prices")
    .set("Authorization", `Bearer ${await auth.getTokenUser1()}`)
    .set("Accept", "application/json")
    .expect(404)
    .then(async () => {
      await database.executeFiles(testDataDir, ["contracts-teardown.sql", "item-groups-prices-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
    });
});

test("Test listing item group prices - invalid item group", async () => {
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "item-groups-prices-setup.sql", "contracts-setup.sql"]);
  
  return request(TestConfig.HOST)
    .get("/rest/v1/contracts/invalid/prices")
    .set("Authorization", `Bearer ${await auth.getTokenUser1()}`)
    .set("Accept", "application/json")
    .expect(404)
    .then(async () => {
      await database.executeFiles(testDataDir, ["contracts-teardown.sql", "item-groups-prices-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
    });
});

test("Test listing item group prices - without token", async () => {
  return request(TestConfig.HOST)
    .get("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976/prices")
    .set("Accept", "application/json")
    .expect(403);
});

test("Test listing item group prices - invalid token", async () => {
  return request(TestConfig.HOST)
    .get("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976/prices")
    .set("Authorization", "Bearer FAKE")
    .set("Accept", "application/json")
    .expect(403);
});

test("Test list contracts - status", async (t) => {
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);

  return request(TestConfig.HOST)
    .get("/rest/v1/contracts?listAll=true&status=DRAFT")
    .set("Authorization", `Bearer ${await auth.getTokenUser1([ApplicationRoles.LIST_ALL_CONTRACTS])}`)
    .set("Accept", "application/json")
    .expect(200)
    .then(async response => {
      await auth.removeUser1Roles([ApplicationRoles.LIST_ALL_CONTRACTS]);
      t.equal(response.body.length, 1);
      t.deepEqual(response.body[0], contractDatas["3950f496-0fba-11e8-9611-0b2da5ab56ce"]);
      await database.executeFiles(testDataDir, ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
    });
});

test("Test list contracts - year", async (t) => {
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);

  return request(TestConfig.HOST)
    .get("/rest/v1/contracts?listAll=true&year=2018")
    .set("Authorization", `Bearer ${await auth.getTokenUser1([ApplicationRoles.LIST_ALL_CONTRACTS])}`)
    .set("Accept", "application/json")
    .expect(200)
    .then(async response => {
      await auth.removeUser1Roles([ApplicationRoles.LIST_ALL_CONTRACTS]);
      t.equal(response.body.length, 1);
      t.deepEqual(response.body[0], contractDatas["3950f496-0fba-11e8-9611-0b2da5ab56ce"]);
      await database.executeFiles(testDataDir, ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
    });
});

test("Test list contracts - itemGroupId", async (t) => {
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);

  return request(TestConfig.HOST)
    .get("/rest/v1/contracts?listAll=true&itemGroupId=98be1d32-0f51-11e8-bb59-3b8b6bbe9a20")
    .set("Authorization", `Bearer ${await auth.getTokenUser1([ApplicationRoles.LIST_ALL_CONTRACTS])}`)
    .set("Accept", "application/json")
    .expect(200)
    .then(async response => {
      await auth.removeUser1Roles([ApplicationRoles.LIST_ALL_CONTRACTS]);
      t.equal(response.body.length, 1);
      t.deepEqual(response.body[0], contractDatas["3950f496-0fba-11e8-9611-0b2da5ab56ce"]);
      await database.executeFiles(testDataDir, ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
    });
});

test("Test view contract quantities", async (t) => {
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);

  const contract = contractDatas["1d45568e-0fba-11e8-9ac4-a700da67a976"];

  return request(TestConfig.HOST)
    .get("/rest/v1/contractQuantities?contactId=6f1cd486-107e-404c-a73f-50cc1fdabdd6&itemGroupId=89723408-0f51-11e8-baa0-dfe7c7eae257")
    .set("Authorization", `Bearer ${await auth.getTokenUser1([ApplicationRoles.VIEW_CONTRACT_QUANTITIES])}`)
    .set("Accept", "application/json")
    .expect(200)
    .then(async response => {
      await auth.removeUser1Roles([ApplicationRoles.VIEW_CONTRACT_QUANTITIES]);
      t.equal(response.body.length, 1);
      t.equal(response.body[0], [{ 
        contractQuantity: contract.contractQuantity,
        deliveredQuantity: contract.deliveredQuantity
      }]);
      await database.executeFiles(testDataDir, ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
    });
});

test("Test view contract quantities - forbidden", async (t) => {
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);

  return request(TestConfig.HOST)
  .get("/rest/v1/contractQuantities?contactId=6f1cd486-107e-404c-a73f-50cc1fdabdd6&itemGroupId=89723408-0f51-11e8-baa0-dfe7c7eae257")
  .set("Authorization", `Bearer ${await auth.getTokenUser1()}`)
  .set("Accept", "application/json")
  .then(async response => {
    await database.executeFiles(testDataDir, ["item-groups-prerequisite-teardown.sql", "item-groups-prices-teardown.sql", "contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
    t.deepEqual(response.body, {
      "code": 403,
      "message": "You have no permission to view contracts quantities" 
    });
  });
});

test("Test view contract quantities - invalid token", async (t) => {
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);

  return request(TestConfig.HOST)
    .get("/rest/v1/contractQuantities?contactId=6f1cd486-107e-404c-a73f-50cc1fdabdd6&itemGroupId=89723408-0f51-11e8-baa0-dfe7c7eae257")
    .set("Authorization", "Bearer FAKE")
    .set("Accept", "application/json")
    .expect(403)
    .then(async response => {
      await database.executeFiles(testDataDir, ["item-groups-prerequisite-teardown.sql", "item-groups-prices-teardown.sql", "contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
    });
});

test("Test view contract quantities - without contactId", async (t) => {
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);

  return request(TestConfig.HOST)
    .get("/rest/v1/contractQuantities?itemGroupId=89723408-0f51-11e8-baa0-dfe7c7eae257")
    .set("Authorization", `Bearer ${await auth.getTokenUser1([ApplicationRoles.VIEW_CONTRACT_QUANTITIES])}`)
    .set("Accept", "application/json")
    .expect(400)
    .then(async response => {
      await database.executeFiles(testDataDir, ["item-groups-prerequisite-teardown.sql", "item-groups-prices-teardown.sql", "contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      t.deepEqual(response.body, {
        "code": 400,
        "message": "Request with no contact ID" 
      });
    });
});

test("Test view contract quantities - without itemgroup", async (t) => {
  await database.executeFiles(testDataDir, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);

  return request(TestConfig.HOST)
  .get("/rest/v1/contractQuantities?contactId=6f1cd486-107e-404c-a73f-50cc1fdabdd6")
  .set("Authorization", `Bearer ${await auth.getTokenUser1([ApplicationRoles.VIEW_CONTRACT_QUANTITIES])}`)
  .set("Accept", "application/json")
    .expect(400)
    .then(async response => {
      await database.executeFiles(testDataDir, ["item-groups-prerequisite-teardown.sql", "item-groups-prices-teardown.sql", "contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      t.deepEqual(response.body, {
        "code": 400,
        "message": "Request with no itemgroup ID" 
      });
    });
});

