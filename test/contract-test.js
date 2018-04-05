/*jshint esversion: 6 */
/* global __dirname */

(() => {
  "use strict";

  const cheerio = require("cheerio");
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
  const contractDataCreate = require(`${__dirname}/data/contracts-create.json`);
  const contractDatasUpdate = require(`${__dirname}/data/contracts-update.json`);
  const contractExcelSingle = require(`${__dirname}/data/contract-xlsx-single.json`);
  const contractExcelMultiple = require(`${__dirname}/data/contract-xlsx-multiple.json`);
  const contractDocumentTemplateDatas = require(`${__dirname}/data/contract-document-templates.json`);
  const contractDocumentTemplateUpdateDatas = require(`${__dirname}/data/contract-document-templates-update.json`);
  const contractDocumentTemplateCreateData = require(`${__dirname}/data/contract-document-templates-create.json`);
  const itemGroupPriceDatas = require(`${__dirname}/data/item-group-prices.json`);

  test("Test creating contracts", async (t) => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);
    
    return request("http://localhost:3002")
      .post("/rest/v1/contracts")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .send(contractDataCreate)
      .expect(200)
      .then(async response => {
        await database.executeFiles(`${__dirname}/data`, ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
        
        Object.keys(contractDataCreate).forEach((expectKey) => {
          const expectValue = contractDataCreate[expectKey];
          const actualValue = response.body[expectKey];
          t.deepEqual(expectValue, actualValue, `[${expectKey}] is ${actualValue}`);
        });
      });
  });

  test("Test listing contracts - xlsx all", async (t) => {
    await users.resetUsers(["6f1cd486-107e-404c-a73f-50cc1fdabdd6", "677e99fd-b854-479f-afa6-74f295052770"], t);
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);

    return request("http://localhost:3002")
      .get("/rest/v1/contracts?listAll=true")
      .set("Authorization", `Bearer ${await auth.getTokenListAllContracts()}`)
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

  test("Test listing contracts - xlsx single", async (t) => {
    await users.resetUsers(["6f1cd486-107e-404c-a73f-50cc1fdabdd6", "677e99fd-b854-479f-afa6-74f295052770"], t);
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
        t.deepEqual(contractExcelSingle, xlsxJson);
      });
  });

  test("Test list contracts", async (t) => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);

    return request("http://localhost:3002")
      .get("/rest/v1/contracts")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .expect(200)
      .then(async response => {
        t.equal(response.body.length, 1);
        t.deepEqual(response.body[0], contractDatas["1d45568e-0fba-11e8-9ac4-a700da67a976"]);
        await database.executeFiles(`${__dirname}/data`, ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      });
  });

  test("Test list contracts - accept with parameters", async (t) => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);

    return request("http://localhost:3002")
      .get("/rest/v1/contracts")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json;charset=utf8")
      .expect(200)
      .then(async response => {
        t.equal(response.body.length, 1);
        t.deepEqual(response.body[0], contractDatas["1d45568e-0fba-11e8-9ac4-a700da67a976"]);
        await database.executeFiles(`${__dirname}/data`, ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      });
  });

  test("Test list contracts - all", async (t) => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);

    return request("http://localhost:3002")
      .get("/rest/v1/contracts?listAll=true")
      .set("Authorization", `Bearer ${await auth.getTokenListAllContracts()}`)
      .set("Accept", "application/json")
      .expect(200)
      .then(async response => {
        t.equal(response.body.length, 2);
        t.deepEqual(response.body[0], contractDatas["1d45568e-0fba-11e8-9ac4-a700da67a976"]);
        t.deepEqual(response.body[1], contractDatas["3950f496-0fba-11e8-9611-0b2da5ab56ce"]);
        await database.executeFiles(`${__dirname}/data`, ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      });
  });
  
  test("Test list contracts - item group category - all", async (t) => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);

    return request("http://localhost:3002")
      .get("/rest/v1/contracts?listAll=true&itemGroupCategory=FRESH")
      .set("Authorization", `Bearer ${await auth.getTokenListAllContracts()}`)
      .set("Accept", "application/json")
      .expect(200)
      .then(async response => {
        t.equal(response.body.length, 1);
        t.deepEqual(response.body[0], contractDatas["3950f496-0fba-11e8-9611-0b2da5ab56ce"]);
        await database.executeFiles(`${__dirname}/data`, ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      });
  });
  
  test("Test list contracts - item group category - user", async (t) => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);

    return request("http://localhost:3002")
      .get("/rest/v1/contracts?itemGroupCategory=FROZEN")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .expect(200)
      .then(async response => {
        t.equal(response.body.length, 1);
        t.deepEqual(response.body[0], contractDatas["1d45568e-0fba-11e8-9ac4-a700da67a976"]);
        await database.executeFiles(`${__dirname}/data`, ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      });
  });
  
  test("Test listing all contracts - forbidden", async () => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);

    return request("http://localhost:3002")
      .get("/rest/v1/contracts?listAll=true")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .expect(403)
      .then(async () => {
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
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql", "contract-documents-setup.sql", "item-groups-prices-setup.sql"]);
    
    return request("http://localhost:3002")
      .get("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976/documents/master?format=PDF")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .expect(200)
      .then(async response => {
        await database.executeFiles(`${__dirname}/data`, ["item-groups-prices-teardown.sql", "contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
        await pdf.extractPdfDataFromBuffer(response.body)
          .then((pdfData) => {
            t.ok(pdfData.rawTextContent.indexOf("1 (1)") > -1, "Contains header page number");
            t.ok(pdfData.rawTextContent.indexOf("Example Co. (company in future)") > -1, "Contains replaced company name");
            t.ok(pdfData.rawTextContent.indexOf("Group 18.00 € / l") > -1, "Contains replaced price");
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
  
  test("Test contract html", async (t) => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql", "contract-documents-setup.sql", "item-groups-prices-setup.sql"]);
    
    return request("http://localhost:3002")
      .get("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976/documents/master?format=HTML")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "text/html")
      .expect(200)
      .then(async response => {
        await database.executeFiles(`${__dirname}/data`, ["item-groups-prices-teardown.sql", "contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
        const $ = cheerio.load(response.text);
        t.equal("Example berry purchase contract", $("h1").text(), "Contains header");
        t.ok($("p").text().indexOf("Example Co. (company in future)") > -1, "Contains replaced company name");
        t.ok($("td").text().indexOf("Group") > -1, "Contains replaced price");
        t.ok($("td").text().indexOf("18.00 € / l") > -1, "Contains replaced price");
      });
  });
  
  test("Test contract pdf - item group", async (t) => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql", "contract-documents-setup.sql"]);
    
    return request("http://localhost:3002")
      .get("/rest/v1/contracts/3950f496-0fba-11e8-9611-0b2da5ab56ce/documents/group?format=HTML")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "text/html")
      .expect(200)
      .then(async response => {
        await database.executeFiles(`${__dirname}/data`, ["contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
        const $ = cheerio.load(response.text);
        t.ok($("p").text().indexOf("Test Corp. (company in future) and Example Co. (company in future).") > -1, "Contains contents");
      });
  });
  
  test("Test contract pdf - without token", async () => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);
    
    return request("http://localhost:3002")
      .get("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976/documents/master?format=PDF")
      .set("Accept", "text/html")
      .expect(403)
      .then(async () => {
        await database.executeFiles(`${__dirname}/data`, ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      });
  });
  
  test("Test contract pdf - invalid token", async () => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);
    
    return request("http://localhost:3002")
      .get("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976/documents/master?format=HTML")
      .set("Authorization", "Bearer FAKE")
      .set("Accept", "text/html")
      .expect(403)
      .then(async () => {
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
      .get("/rest/v1/contracts?listAll=true&maxResults=10")
      .set("Authorization", `Bearer ${await auth.getTokenListAllContracts()}`)
      .set("Accept", "application/json")
      .expect(200)
      .then(async response => {
        await users.resetUsers(["6f1cd486-107e-404c-a73f-50cc1fdabdd6", "677e99fd-b854-479f-afa6-74f295052770"], t);
        await database.executeFiles(`${__dirname}/data`, ["contracts-teardown.sql", "item-groups-teardown.sql", "operation-reports-teardown.sql"]);
        
        const actualContracts = response.body;
        actualContracts.sort((c1, c2) => {
          if (c1.year === c2.year) {
            return c1.contractQuantity - c2.contractQuantity;
          } else {
            return c2.year - c1.year;
          }
        });

        contractDatasSync.forEach((expectedContract, contractIndex) => {
          Object.keys(expectedContract).forEach((expectKey) => {
            const expectValue = expectedContract[expectKey];
            const actualValue = response.body[contractIndex][expectKey];
            t.deepEqual(expectValue, actualValue, `[${contractIndex}][${expectKey}] is ${actualValue}`);
          });
        });
      });
  });

  test("Test contract xlsx", async (t) => {
    await users.resetUsers(["6f1cd486-107e-404c-a73f-50cc1fdabdd6", "677e99fd-b854-479f-afa6-74f295052770"], t);
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
  
  test("Test updating contracts", async (t) => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);
    
    return request("http://localhost:3002")
      .put("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .send(contractDatasUpdate["1d45568e-0fba-11e8-9ac4-a700da67a976"])
      .expect(200)
      .then(async response => {
        await database.executeFiles(`${__dirname}/data`, ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
        t.deepEqual(response.body, contractDatasUpdate["1d45568e-0fba-11e8-9ac4-a700da67a976"]);
      });
  });

  test("Test find contract document template", async (t) => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql", "contract-documents-setup.sql"]);
    
    return request("http://localhost:3002")
      .get("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976/documentTemplates/2ba4ace6-2227-11e8-8cd7-ef6b34e82618")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .expect(200)
      .then(async response => {
        await database.executeFiles(`${__dirname}/data`, ["contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
        t.deepEqual(response.body, contractDocumentTemplateDatas["2ba4ace6-2227-11e8-8cd7-ef6b34e82618"]);
      });
  });

  test("Test find contract document template - incorrect contract", async () => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql", "contract-documents-setup.sql"]);
    
    return request("http://localhost:3002")
      .get("/rest/v1/contracts/89723408-0f51-11e8-baa0-dfe7c7eae257/documentTemplates/2ba4ace6-2227-11e8-8cd7-ef6b34e82618")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .expect(404)
      .then(async () => {
        await database.executeFiles(`${__dirname}/data`, ["contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      });
  });

  test("Test find contract document template - invalid contract", async () => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql", "contract-documents-setup.sql"]);
    
    return request("http://localhost:3002")
      .get("/rest/v1/contracts/invalid/documentTemplates/2ba4ace6-2227-11e8-8cd7-ef6b34e82618")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .expect(404)
      .then(async () => {
        await database.executeFiles(`${__dirname}/data`, ["contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      });
  });
  
  test("Test find contract document template - incorrect id", async () => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql", "contract-documents-setup.sql"]);
    
    return request("http://localhost:3002")
      .get("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976/documentTemplates/2fe6ad72-2227-11e8-a5fd-efc457362c53")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .expect(404)
      .then(async () => {
        await database.executeFiles(`${__dirname}/data`, ["contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      });
  });
  
  test("Test find contract document template - invalid id", async () => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql", "contract-documents-setup.sql"]);
    
    return request("http://localhost:3002")
      .get("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976/documentTemplates/not-uuid")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .expect(404)
      .then(async () => {
        await database.executeFiles(`${__dirname}/data`, ["contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      });
  });
  
  test("Test list contract document templates", async (t) => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql", "contract-documents-setup.sql"]);
    
    return request("http://localhost:3002")
      .get("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976/documentTemplates")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .expect(200)
      .then(async response => {
        await database.executeFiles(`${__dirname}/data`, ["contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
        t.equal(response.body.length, 1);
        t.deepEqual(response.body[0], contractDocumentTemplateDatas["2ba4ace6-2227-11e8-8cd7-ef6b34e82618"]);
      });
  });
  
  test("Test list contract document templates - by type", async (t) => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql", "contract-documents-setup.sql"]);
    
    return request("http://localhost:3002")
      .get("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976/documentTemplates?type=master")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .expect(200)
      .then(async response => {
        await database.executeFiles(`${__dirname}/data`, ["contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
        t.equal(response.body.length, 1);
        t.deepEqual(response.body[0], contractDocumentTemplateDatas["2ba4ace6-2227-11e8-8cd7-ef6b34e82618"]);
      });
  });
  
  test("Test list contract document templates - by type - not found", async (t) => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql", "contract-documents-setup.sql"]);
    
    return request("http://localhost:3002")
      .get("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976/documentTemplates?type=notfound")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .expect(200)
      .then(async response => {
        await database.executeFiles(`${__dirname}/data`, ["contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
        t.equal(response.body.length, 0);
      });
  });
  
  test("Test update contract document template", async (t) => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql", "contract-documents-setup.sql"]);
    
    return request("http://localhost:3002")
      .put("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976/documentTemplates/2ba4ace6-2227-11e8-8cd7-ef6b34e82618")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .send(contractDocumentTemplateUpdateDatas["2ba4ace6-2227-11e8-8cd7-ef6b34e82618"])
      .expect(200)
      .then(async response => {
        await database.executeFiles(`${__dirname}/data`, ["contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
        t.deepEqual(response.body, contractDocumentTemplateUpdateDatas["2ba4ace6-2227-11e8-8cd7-ef6b34e82618"]);
      });
  });
  
  test("Test create contract document template", async (t) => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql", "contract-documents-setup.sql"]);
    
    return request("http://localhost:3002")
      .post("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976/documentTemplates")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .send(contractDocumentTemplateCreateData)
      .expect(200)
      .then(async response => {
        await database.executeFiles(`${__dirname}/data`, ["contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
        
        const expected = contractDocumentTemplateCreateData;
        Object.keys(expected).forEach((expectKey) => {
          const expectValue = expected[expectKey];
          const actualValue = response.body[expectKey];
          t.equal(actualValue, expectValue, `[${expectKey}] is ${actualValue}`);
        });
      });
  });

  test("Test listing item group prices", async (t) => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "item-groups-prices-setup.sql", "contracts-setup.sql"]);
    
    return request("http://localhost:3002")
      .get("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976/prices")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .expect(200)
      .then(async response => {
        await database.executeFiles(`${__dirname}/data`, ["contracts-teardown.sql", "item-groups-prices-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
        t.equal(response.body.length, 2);
        t.deepEqual(response.body[0], itemGroupPriceDatas["2cef70dc-3103-11e8-bc28-9b65ff9275bf"]);
        t.deepEqual(response.body[1], itemGroupPriceDatas["30685c88-3103-11e8-91df-87fa68b14005"]);
      });
  });

  test("Test listing item group prices - sort year desc", async (t) => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "item-groups-prices-setup.sql", "contracts-setup.sql"]);
    
    return request("http://localhost:3002")
      .get("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976/prices?sortBy=YEAR&sortDir=DESC")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .expect(200)
      .then(async response => {
        await database.executeFiles(`${__dirname}/data`, ["contracts-teardown.sql", "item-groups-prices-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
        t.equal(response.body.length, 2);
        t.deepEqual(response.body[0], itemGroupPriceDatas["30685c88-3103-11e8-91df-87fa68b14005"]);
        t.deepEqual(response.body[1], itemGroupPriceDatas["2cef70dc-3103-11e8-bc28-9b65ff9275bf"]);
      });
  });

  test("Test listing item group prices - sort year asc", async (t) => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "item-groups-prices-setup.sql", "contracts-setup.sql"]);
    
    return request("http://localhost:3002")
      .get("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976/prices?sortBy=YEAR&sortDir=ASC")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .expect(200)
      .then(async response => {
        await database.executeFiles(`${__dirname}/data`, ["contracts-teardown.sql", "item-groups-prices-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
        t.equal(response.body.length, 2);
        t.deepEqual(response.body[0], itemGroupPriceDatas["2cef70dc-3103-11e8-bc28-9b65ff9275bf"]);
        t.deepEqual(response.body[1], itemGroupPriceDatas["30685c88-3103-11e8-91df-87fa68b14005"]);
      });
  });

  test("Test listing item group prices - limit", async (t) => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "item-groups-prices-setup.sql", "contracts-setup.sql"]);
    
    return request("http://localhost:3002")
      .get("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976/prices?sortBy=YEAR&sortDir=ASC&maxResults=1")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .expect(200)
      .then(async response => {
        await database.executeFiles(`${__dirname}/data`, ["contracts-teardown.sql", "item-groups-prices-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
        t.equal(response.body.length, 1);
        t.deepEqual(response.body[0], itemGroupPriceDatas["2cef70dc-3103-11e8-bc28-9b65ff9275bf"]);
      });
  });

  test("Test listing item group prices - offset", async (t) => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "item-groups-prices-setup.sql", "contracts-setup.sql"]);
    
    return request("http://localhost:3002")
      .get("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976/prices?sortBy=YEAR&sortDir=ASC&firstResult=1")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .expect(200)
      .then(async response => {
        await database.executeFiles(`${__dirname}/data`, ["contracts-teardown.sql", "item-groups-prices-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
        t.equal(response.body.length, 1);
        t.deepEqual(response.body[0], itemGroupPriceDatas["30685c88-3103-11e8-91df-87fa68b14005"]);
      });
  });

  test("Test listing item group prices - incorrect item group", async () => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "item-groups-prices-setup.sql", "contracts-setup.sql"]);
    
    return request("http://localhost:3002")
      .get("/rest/v1/contracts/12345678-0fba-11e8-9ac4-a700da67a976/prices")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .expect(404)
      .then(async () => {
        await database.executeFiles(`${__dirname}/data`, ["contracts-teardown.sql", "item-groups-prices-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      });
  });

  test("Test listing item group prices - invalid item group", async () => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "item-groups-prices-setup.sql", "contracts-setup.sql"]);
    
    return request("http://localhost:3002")
      .get("/rest/v1/contracts/invalid/prices")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .expect(404)
      .then(async () => {
        await database.executeFiles(`${__dirname}/data`, ["contracts-teardown.sql", "item-groups-prices-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      });
  });

  test("Test listing item group prices - without token", async () => {
    return request("http://localhost:3002")
      .get("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976/prices")
      .set("Accept", "application/json")
      .expect(403);
  });

  test("Test listing item group prices - invalid token", async () => {
    return request("http://localhost:3002")
      .get("/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976/prices")
      .set("Authorization", "Bearer FAKE")
      .set("Accept", "application/json")
      .expect(403);
  });
  
  test("Test list contracts - status", async (t) => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);

    return request("http://localhost:3002")
      .get("/rest/v1/contracts?listAll=true&status=DRAFT")
      .set("Authorization", `Bearer ${await auth.getTokenListAllContracts()}`)
      .set("Accept", "application/json")
      .expect(200)
      .then(async response => {
        t.equal(response.body.length, 1);
        t.deepEqual(response.body[0], contractDatas["3950f496-0fba-11e8-9611-0b2da5ab56ce"]);
        await database.executeFiles(`${__dirname}/data`, ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      });
  });

  test("Test list contracts - year", async (t) => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);

    return request("http://localhost:3002")
      .get("/rest/v1/contracts?listAll=true&year=2018")
      .set("Authorization", `Bearer ${await auth.getTokenListAllContracts()}`)
      .set("Accept", "application/json")
      .expect(200)
      .then(async response => {
        t.equal(response.body.length, 1);
        t.deepEqual(response.body[0], contractDatas["3950f496-0fba-11e8-9611-0b2da5ab56ce"]);
        await database.executeFiles(`${__dirname}/data`, ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      });
  });

  test("Test list contracts - itemGroupId", async (t) => {
    await database.executeFiles(`${__dirname}/data`, ["delivery-places-setup.sql", "item-groups-setup.sql", "contracts-setup.sql"]);

    return request("http://localhost:3002")
      .get("/rest/v1/contracts?listAll=true&itemGroupId=98be1d32-0f51-11e8-bb59-3b8b6bbe9a20")
      .set("Authorization", `Bearer ${await auth.getTokenListAllContracts()}`)
      .set("Accept", "application/json")
      .expect(200)
      .then(async response => {
        t.equal(response.body.length, 1);
        t.deepEqual(response.body[0], contractDatas["3950f496-0fba-11e8-9611-0b2da5ab56ce"]);
        await database.executeFiles(`${__dirname}/data`, ["contracts-teardown.sql", "item-groups-teardown.sql", "delivery-places-teardown.sql"]);
      });
  });
  
})();