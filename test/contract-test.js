/*jshint esversion: 6 */
/* global __dirname */

(() => {
  "use strict";

  const test = require("blue-tape");
  const request = require("supertest");
  const requestUtils = require(`${__dirname}/request-utils`);
  const database = require(`${__dirname}/database`);
  const operations = require(`${__dirname}/operations`);
  const users = require(`${__dirname}/users`);
  const pdf = require(`${__dirname}/pdf`);
  const auth = require(`${__dirname}/auth`);
  const xlsx = require(`${__dirname}/xlsx`);
  const contractDatas = require(`${__dirname}/data/contracts.json`);
  const contractDatasSync = require(`${__dirname}/data/contracts-sync.json`);
  const contractExcelSingle = require(`${__dirname}/data/contract-xlsx-single.json`);
  const contractExcelMultiple = require(`${__dirname}/data/contract-xlsx-multiple.json`);

  test("Test listing contracts", async (t) => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);

    return request("http://localhost:3002")
      .get("/rest/v1/contracts")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
      .expect(200)
      .parse(requestUtils.createBinaryParser())
      .then(async response => {
        await database.executeFiles(`${__dirname}/data`, ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
        const xlsxJson = xlsx.parseXlsx(response.body);
        t.equal(response.type, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        t.deepEqual(xlsxJson, contractExcelMultiple);
      });
  });

  test("Test listing contracts", async (t) => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);

    return request("http://localhost:3002")
      .get("/rest/v1/contracts")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .expect(200)
      .then(async response => {
        t.equal(response.body.length, 2);
        t.deepEqual(response.body[0], contractDatas["1d45568e-0fba-11e8-9ac4-a700da67a976"]);
        t.deepEqual(response.body[1], contractDatas["3950f496-0fba-11e8-9611-0b2da5ab56ce"]);
        await database.executeFiles(`${__dirname}/data`, ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      });
  });
  
  test("Test listing contracts - without token", async () => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);

    return request("http://localhost:3002")
      .get("/rest/v1/contracts")
      .set("Accept", "application/json")
      .expect(403)
      .then(async response => {
        await database.executeFiles(`${__dirname}/data`, ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      });
  });
  
  test("Test listing contracts - invalid token", async () => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);

    return request("http://localhost:3002")
      .get("/rest/v1/contracts")
      .set("Authorization", "Bearer FAKE")
      .set("Accept", "application/json")
      .expect(403)
      .then(async response => {
        await database.executeFiles(`${__dirname}/data`, ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      });
  });
  
  test("Test finding contracts", async (t) => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);
    
    return request("http://localhost:3002")
      .get("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .expect(200)
      .then(async response => {
        await database.executeFiles(`${__dirname}/data`, ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
        t.deepEqual(response.body, contractDatas["1d45568e-0fba-11e8-9ac4-a700da67a976"]);
      });
  });
  
  test("Test finding contracts - without token", async () => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);
    
    return request("http://localhost:3002")
      .get("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976")
      .set("Accept", "application/json")
      .expect(403)
      .then(async response => {
        await database.executeFiles(`${__dirname}/data`, ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      });
  });
  
  test("Test finding contracts - invalid token", async () => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);
    
    return request("http://localhost:3002")
      .get("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976")
      .set("Authorization", "Bearer FAKE")
      .set("Accept", "application/json")
      .expect(403)
      .then(async response => {
        await database.executeFiles(`${__dirname}/data`, ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      });
  });
  
  test("Test finding contract - not found", async () => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);
    
    return request("http://localhost:3002")
      .get("/rest/v1/contracts/c74e5468-0fb1-11e8-a4e2-87868e24ee8b")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .expect(404)
      .then(async response => {
        await database.executeFiles(`${__dirname}/data`, ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      });
  });
  
  test("Test finding contract - malformed id", async () => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);
    
    return request("http://localhost:3002")
      .get("/rest/v1/contracts/not-uuid")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .expect(404)
      .then(async response => {
        await database.executeFiles(`${__dirname}/data`, ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      });
  });
  
  test("Test contract pdf", async (t) => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql", "contract-documents-setup.sql"]);
    
    return request("http://localhost:3002")
      .get("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976/documents/master?format=PDF")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .expect(200)
      .then(async response => {
        await database.executeFiles(`${__dirname}/data`, ["contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
        await pdf.extractPdfDataFromBuffer(response.body)
          .then((pdfData) => {
            t.ok(pdfData.rawTextContent.indexOf("1 (1)") > -1, "Contains header page number");
            t.ok(pdfData.rawTextContent.indexOf("Example Co. (company in future)") > -1, "Contains replaced company name");
            t.ok(pdfData.rawTextContent.indexOf("https://www.example.com") > -1, "contains footer");
          });
      });
  });
  
  test("Test contract pdf - item group", async (t) => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql", "contract-documents-setup.sql"]);
    
    return request("http://localhost:3002")
      .get("/rest/v1/contracts/3950f496-0fba-11e8-9611-0b2da5ab56ce/documents/group?format=PDF")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .expect(200)
      .then(async response => {
        await database.executeFiles(`${__dirname}/data`, ["contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
        await pdf.extractPdfDataFromBuffer(response.body)
          .then((pdfData) => {
            t.ok(pdfData.rawTextContent.indexOf("Example group purchase contract") > -1, "Contains contents");
          });
      });
  });
  
  test("Test contract pdf - without token", async () => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);
    
    return request("http://localhost:3002")
      .get("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976/documents/master?format=PDF")
      .set("Accept", "application/json")
      .expect(403)
      .then(async response => {
        await database.executeFiles(`${__dirname}/data`, ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      });
  });
  
  test("Test contract pdf - invalid token", async () => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);
    
    return request("http://localhost:3002")
      .get("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976/documents/master?format=PDF")
      .set("Authorization", "Bearer FAKE")
      .set("Accept", "application/json")
      .expect(403)
      .then(async response => {
        await database.executeFiles(`${__dirname}/data`, ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      });
  });

  test("Test sync contracts", async (t) => {
    const accessToken = await auth.getTokenDefault();
    
    await operations.createOperationAndWait(accessToken, "SAP_CONTACT_SYNC");
    await operations.createOperationAndWait(accessToken, "SAP_DELIVERY_PLACE_SYNC");
    await operations.createOperationAndWait(accessToken, "SAP_ITEM_GROUP_SYNC");
    await operations.createOperationAndWait(accessToken, "SAP_CONTRACT_SYNC");
    
    return request("http://localhost:3002")
      .get("/rest/v1/contracts")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("Accept", "application/json")
      .expect(200)
      .then(async response => {
        const actualContracts = response.body;
        actualContracts.sort((c1, c2) => {
          return c1.quantity - c2.quantity;
        });

        contractDatasSync.forEach((expectedContract, contractIndex) => {
          Object.keys(expectedContract).forEach((expectKey) => {
            const expectValue = expectedContract[expectKey];
            const actualValue = response.body[contractIndex][expectKey];
            t.equal(actualValue, expectValue, `[${contractIndex}][${expectKey}] is ${actualValue}`);
          });
        });        

        await Promise.all([
          users.resetUsers(["6f1cd486-107e-404c-a73f-50cc1fdabdd6", "677e99fd-b854-479f-afa6-74f295052770"], t),
          database.executeFiles(`${__dirname}/data`, ["contracts-teardown.sql", "item-groups-teardown.sql", "operation-reports-teardown.sql"])
        ]);
      });
  });

  test("Test contract xlsx", async (t) => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql", "contract-documents-setup.sql"]);
    
    return request("http://localhost:3002")
      .get("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
      .expect(200)
      .parse(requestUtils.createBinaryParser())
      .then(async response => {
        await database.executeFiles(`${__dirname}/data`, ["contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
        const xlsxJson = xlsx.parseXlsx(response.body);
        t.equal(response.type, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        t.deepEqual(xlsxJson, contractExcelSingle);
      });
  });

  test("Test contract xlsx - invalid format", async () => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql", "contract-documents-setup.sql"]);
    
    return request("http://localhost:3002")
      .get("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/xml")
      .expect(400)
      .then(async () => {
        await database.executeFiles(`${__dirname}/data`, ["contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      });
  });
  
  test("Test contract xlsx - without token", async () => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);
    
    return request("http://localhost:3002")
      .get("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976")
      .set("Accept", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
      .expect(403)
      .then(async () => {
        await database.executeFiles(`${__dirname}/data`, ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      });
  });
  
})();