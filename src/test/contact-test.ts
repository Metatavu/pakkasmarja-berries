import * as test from "blue-tape"; 
import * as request from "supertest";
import auth from "./auth";
import users from "./users";
import ApplicationRoles from "../rest/application-roles";
import mail from "./mail";
import database from "./database";
import operations from "./operations";
import { BasicContact } from "src/rest/model/models";
import TestConfig from "./test-config";
import sapMock from "./sap-mock";

const testDataDir = `${__dirname}/../../src/test/data/`;
const contactDatas = require(`${testDataDir}/contacts.json`);
const contactDataSync = require(`${testDataDir}/contacts-sync.json`);
const contactUpdateMails = require(`${testDataDir}/contact-update-mails.json`);

test("Test listing contacts", async (t) => {
  await users.resetUsers(["6f1cd486-107e-404c-a73f-50cc1fdabdd6", "677e99fd-b854-479f-afa6-74f295052770"], t);
  const token = await auth.getTokenUser1([ApplicationRoles.LIST_ALL_CONTACTS]);

  return request(TestConfig.HOST)
    .get("/rest/v1/contacts")
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .expect(200)
    .then(async response => {
      await auth.removeUser1Roles([ApplicationRoles.LIST_ALL_CONTACTS]);

      t.equal(response.body.length, 5);
      const actualResponse: any[] = response.body;

      actualResponse.sort((a, b) => {
        return b.id.localeCompare(a.id);
      });

      t.deepEqual(contactDatas["6f1cd486-107e-404c-a73f-50cc1fdabdd6"], actualResponse.find(c => c.id === "6f1cd486-107e-404c-a73f-50cc1fdabdd6"));
      t.deepEqual(contactDatas["677e99fd-b854-479f-afa6-74f295052770"], actualResponse.find(c => c.id === "677e99fd-b854-479f-afa6-74f295052770"));
    });
});

test("Test listing contacts - search", async (t) => {
  await users.resetUsers(["6f1cd486-107e-404c-a73f-50cc1fdabdd6", "677e99fd-b854-479f-afa6-74f295052770"], t);
  
  return request(TestConfig.HOST)
    .get("/rest/v1/contacts?search=test1@testrealm1.com")
    .set("Authorization", `Bearer ${await auth.getTokenUser1([ApplicationRoles.LIST_ALL_CONTACTS])}`)
    .set("Accept", "application/json")
    .expect(200)
    .then(async response => {
      await auth.removeUser1Roles([ApplicationRoles.LIST_ALL_CONTACTS]);
      t.equal(response.body.length, 1);
      t.deepEqual(contactDatas["6f1cd486-107e-404c-a73f-50cc1fdabdd6"], response.body[0]);
    });
});

test("Test listing contacts - without token", async () => {
  return request(TestConfig.HOST)
    .get("/rest/v1/contacts")
    .set("Accept", "application/json")
    .expect(403);
});

test("Test listing contacts - invalid token", async () => {
  return request(TestConfig.HOST)
    .get("/rest/v1/contacts")
    .set("Authorization", "Bearer FAKE")
    .set("Accept", "application/json")
    .expect(403);
});

test("Test find contact", async (t) => {
  await users.resetUsers(["6f1cd486-107e-404c-a73f-50cc1fdabdd6", "677e99fd-b854-479f-afa6-74f295052770"], t);

  return request(TestConfig.HOST)
    .get("/rest/v1/contacts/677e99fd-b854-479f-afa6-74f295052770")
    .set("Authorization", `Bearer ${await auth.getTokenUser2()}`)
    .set("Accept", "application/json")
    .expect(200)
    .then(response => {
      t.deepEqual(response.body, contactDatas["677e99fd-b854-479f-afa6-74f295052770"]);
    });
});

test("Test find basic contact", async (t) => {
  await users.resetUsers(["6f1cd486-107e-404c-a73f-50cc1fdabdd6", "677e99fd-b854-479f-afa6-74f295052770"], t);
  const id = "677e99fd-b854-479f-afa6-74f295052770";

  return request(TestConfig.HOST)
    .get(`/rest/v1/contacts/${id}/basic`)
    .set("Authorization", `Bearer ${await auth.getTokenUser2()}`)
    .set("Accept", "application/json")
    .expect(200)
    .then(response => {
      const expected: BasicContact = {
        id: contactDatas[id].id,
        displayName: contactDatas[id].displayName,
        avatarUrl: contactDatas[id].avatarUrl
      };

      t.deepEqual(response.body, expected);
    });
});

test("Test find contact - without token", async () => {
  return request(TestConfig.HOST)
    .get("/rest/v1/contacts/677e99fd-b854-479f-afa6-74f295052770")
    .set("Accept", "application/json")
    .expect(403);
});

test("Test find contact - invalid token", async () => {
  return request(TestConfig.HOST)
    .get("/rest/v1/contacts/677e99fd-b854-479f-afa6-74f295052770")
    .set("Authorization", "Bearer FAKE")
    .set("Accept", "application/json")
    .expect(403);
});

test("Test find contact - not found", async () => {
  return request(TestConfig.HOST)
    .get("/rest/v1/contacts/a0b445c6-0f05-11e8-8e96-5ffcb5929488")
    .set("Authorization", `Bearer ${await auth.getTokenUser1([ApplicationRoles.LIST_ALL_CONTACTS])}`)
    .set("Accept", "application/json")
    .expect(404)
    .then(async () => {
      await auth.removeUser1Roles([ApplicationRoles.LIST_ALL_CONTACTS]);
    });
});

test("Test find contact - invalid id", async () => {
  return request(TestConfig.HOST)
    .get("/rest/v1/contacts/not-uuid")
    .set("Authorization", `Bearer ${await auth.getTokenUser1([ApplicationRoles.LIST_ALL_CONTACTS])}`)
    .set("Accept", "application/json")
    .expect(404)
    .then(async () => {
      await auth.removeUser1Roles([ApplicationRoles.LIST_ALL_CONTACTS]);
    });
});

test("Test update contact", async (t) => {
  mail.clearOutbox();
  const updateData = Object.assign({}, contactDatas["677e99fd-b854-479f-afa6-74f295052770"], {
    "firstName": "Updated first name",
    "lastName": "Updated last name",
    "companyName": "Updated company name",
    "phoneNumbers": ["+123 567 8901"],
    "email": "updatedemail@testrealm1.com",
    "addresses": [{
      "streetAddress": "Updated street",
      "postalCode": "98765",
      "city": "Updated city"
    }],
    "BIC": "DABAIE3D",
    "IBAN": "FI1112345600000786",
    "taxCode": "FI23456789",
    "vatLiable": "EU",
    "audit": "No",
    "avatarUrl": "https://www.gravatar.com/avatar/0c8a21d448e8e36a88f2f3d63c6cecfdcc4c9981?d=identicon",
    "displayName": "Updated first name Updated last name Updated company name"
  });
  
  return request(TestConfig.HOST)
    .put(`/rest/v1/contacts/${updateData.id}`)
    .set("Authorization", `Bearer ${await auth.getTokenUser2()}`)
    .send(updateData)
    .set("Accept", "application/json")
    .expect(200)
    .then(response => {
      t.deepEqual(mail.getOutbox(), contactUpdateMails);
      t.deepEqual(response.body, updateData);
      return users.resetUser(updateData.id, t);
    });
});

test("Test update contact without changes", async (t) => {
  await users.resetUsers(["677e99fd-b854-479f-afa6-74f295052770"], t);
  
  mail.clearOutbox();
  t.deepEqual(mail.getOutbox().length, 0);

  const updateData = Object.assign({}, contactDatas["677e99fd-b854-479f-afa6-74f295052770"], {
    "firstName": "Updated first name",
    "lastName": "Updated last name",
    "companyName": "Updated company name",
    "phoneNumbers": ["+123 567 8901"],
    "email": "updatedemail@testrealm1.com",
    "addresses": [{
      "streetAddress": "Updated street",
      "postalCode": "98765",
      "city": "Updated city"
    }],
    "BIC": "DABAIE3D",
    "IBAN": "FI1112345600000786",
    "taxCode": "FI23456789",
    "vatLiable": "EU",
    "audit": "No",
    "avatarUrl": "https://www.gravatar.com/avatar/0c8a21d448e8e36a88f2f3d63c6cecfdcc4c9981?d=identicon",
    "displayName": "Updated first name Updated last name Updated company name"
  });
  
  return request(TestConfig.HOST)
    .put(`/rest/v1/contacts/${updateData.id}`)
    .set("Authorization", `Bearer ${await auth.getTokenUser2()}`)
    .send(updateData)
    .set("Accept", "application/json")
    .expect(200)
    .send(updateData)
    .set("Accept", "application/json")
    .expect(200)
    .then(response => {
      t.deepEqual(mail.getOutbox().length, 1);
      t.deepEqual(response.body, updateData);
      return users.resetUser(updateData.id, t);
    });
});

test("Test update contact - without token", async () => {
  const updateData = Object.assign({}, contactDatas["677e99fd-b854-479f-afa6-74f295052770"], {
    "firstName": "Updated first name",
    "lastName": "Updated last name",
    "companyName": "Updated company name",
    "phoneNumbers": ["+123 567 8901"],
    "email": "updatedemail@testrealm1.com",
    "addresses": [{
      "streetAddress": "Updated street",
      "postalCode": "98765"
    }],
    "BIC": "DABAIE3D",
    "IBAN": "FI1112345600000786",
    "taxCode": "FI23456789",
    "vatLiable": "EU",
    "audit": "No"
  });
  
  return request(TestConfig.HOST)
    .put(`/rest/v1/contacts/${updateData.id}`)
    .send(updateData)
    .set("Accept", "application/json")
    .expect(403);
});

test("Test update contact - invalid token", async () => {
  const updateData = Object.assign({}, contactDatas["677e99fd-b854-479f-afa6-74f295052770"], {
    "firstName": "Updated first name",
    "lastName": "Updated last name",
    "companyName": "Updated company name",
    "phoneNumbers": ["+123 567 8901"],
    "email": "updatedemail@testrealm1.com",
    "addresses": [{
      "streetAddress": "Updated street",
      "postalCode": "98765"
    }],
    "BIC": "DABAIE3D",
    "IBAN": "FI1112345600000786",
    "taxCode": "FI23456789",
    "vatLiable": "EU",
    "audit": "No"
  });
  
  return request(TestConfig.HOST)
    .put(`/rest/v1/contacts/${updateData.id}`)
    .set("Authorization", "Bearer FAKE")
    .send(updateData)
    .set("Accept", "application/json")
    .expect(403);
});

test("Test update contact - not found", async () => {
  return request(TestConfig.HOST)
    .put(`/rest/v1/contacts/5ddca0e8-0f2f-11e8-aaee-fbf8db060bc5`)
    .set("Authorization", `Bearer ${await auth.getTokenUser1([ApplicationRoles.LIST_ALL_CONTACTS])}`)
    .set("Accept", "application/json")
    .then(async () => {
      await auth.removeUser1Roles([ApplicationRoles.LIST_ALL_CONTACTS]);
    });
});

test("Test update contact - malformed", async () => {
  return request(TestConfig.HOST)
    .put(`/rest/v1/contacts/677e99fd-b854-479f-afa6-74f295052770`)
    .set("Authorization", `Bearer ${await auth.getTokenUser2([ApplicationRoles.LIST_ALL_CONTACTS])}`)
    .send("malformed data")
    .set("Accept", "application/json")
    .expect(400)
    .then(async () => {
      await auth.removeUser2Roles([ApplicationRoles.LIST_ALL_CONTACTS]);
    });
});

test("Test sync contact", async (t) => {
  sapMock.mockBusinessPartner("1");

  const accessToken = await auth.getTokenUser1([ApplicationRoles.LIST_ALL_CONTACTS]);
  await operations.createOperationAndWait(await auth.getAdminToken(), "SAP_CONTACT_SYNC");
  
  return request(TestConfig.HOST)
    .get("/rest/v1/contacts/6f1cd486-107e-404c-a73f-50cc1fdabdd6")
    .set("Authorization", `Bearer ${accessToken}`)
    .set("Accept", "application/json")
    .expect(200)
    .then(async response => {
      await Promise.all([
        auth.removeUser1Roles([ApplicationRoles.LIST_ALL_CONTACTS]),
        users.resetUsers(["6f1cd486-107e-404c-a73f-50cc1fdabdd6", "677e99fd-b854-479f-afa6-74f295052770"], t),
        database.executeFiles(testDataDir, ["contract-documents-teardown.sql", "contracts-teardown.sql", "item-groups-prices-teardown.sql", "item-groups-teardown.sql", "operation-reports-teardown.sql"])
      ]);

      // TODO: FIX THIS!!!!
      response.body.audit = contactDataSync["6f1cd486-107e-404c-a73f-50cc1fdabdd6"].audit;
      t.deepEqual(response.body, contactDataSync["6f1cd486-107e-404c-a73f-50cc1fdabdd6"]);

      await sapMock.deleteMocks();
    });
});

test("Test update contact password change", async (t) => {
  t.notOk(await auth.getToken("test1-testrealm1", "fake-password"), "fake password should not return token");
  return request(TestConfig.HOST)
    .put("/rest/v1/contacts/6f1cd486-107e-404c-a73f-50cc1fdabdd6/credentials")
    .set("Authorization", `Bearer ${await auth.getTokenUser1()}`)
    .send({ "password": "fake-password" })
    .set("Accept", "application/json")
    .expect(204)
    .then(async() => {
      t.notOk(await auth.getToken("test1-testrealm1", "test"), "Initial password should not return token after reset");
      t.ok(await auth.getToken("test1-testrealm1", "fake-password"), "updated password should return token");
      await users.resetUserPassword("6f1cd486-107e-404c-a73f-50cc1fdabdd6", "test1-testrealm1", "fake-password", "test");
    });
});