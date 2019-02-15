import * as test from "blue-tape"; 
import * as request from "supertest";
import auth from "./auth";
import users from "./users";
import ApplicationRoles from "../rest/application-roles";
/**import mail from "./mail";
import database from "./database";
import operations from "./operations";
 */
const testDataDir = `${__dirname}/../../src/test/data/`;
const contactDatas = require(`${testDataDir}/contacts.json`);/**
const contactDataSync = require(`${testDataDir}/contacts-sync.json`);
const contactUpdateMails = require(`${testDataDir}/contact-update-mails.json`);
*/
test("Test listing contacts", async (t) => {
  await users.resetUsers(["6f1cd486-107e-404c-a73f-50cc1fdabdd6", "677e99fd-b854-479f-afa6-74f295052770"], t);
  const token = await auth.getTokenUser1([ApplicationRoles.LIST_ALL_CONTACTS]);

  return request("http://localhost:3002")
    .get("/rest/v1/contacts")
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .expect(200)
    .then(async response => {
      await auth.removeUser1Roles([ApplicationRoles.LIST_ALL_CONTACTS]);

      t.equal(response.body.length, 4);
      const actualResponse: any[] = response.body;

      actualResponse.sort((a, b) => {
        return b.id.localeCompare(a.id);
      });

      t.deepEqual(contactDatas["6f1cd486-107e-404c-a73f-50cc1fdabdd6"], actualResponse[0]);
      t.deepEqual(contactDatas["677e99fd-b854-479f-afa6-74f295052770"], actualResponse[2]);
    });
});/**

test("Test listing contacts - search", async (t) => {
  await users.resetUsers(["6f1cd486-107e-404c-a73f-50cc1fdabdd6", "677e99fd-b854-479f-afa6-74f295052770"], t);
  
  return request("http://localhost:3002")
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
  return request("http://localhost:3002")
    .get("/rest/v1/contacts")
    .set("Accept", "application/json")
    .expect(403);
});

test("Test listing contacts - invalid token", async () => {
  return request("http://localhost:3002")
    .get("/rest/v1/contacts")
    .set("Authorization", "Bearer FAKE")
    .set("Accept", "application/json")
    .expect(403);
});

test("Test find contact", async (t) => {
  return request("http://localhost:3002")
    .get("/rest/v1/contacts/677e99fd-b854-479f-afa6-74f295052770")
    .set("Authorization", `Bearer ${await auth.getTokenUser2()}`)
    .set("Accept", "application/json")
    .expect(200)
    .then(response => {
      t.deepEqual(response.body, contactDatas["677e99fd-b854-479f-afa6-74f295052770"]);
    });
});

test("Test find contact - without token", async () => {
  return request("http://localhost:3002")
    .get("/rest/v1/contacts/677e99fd-b854-479f-afa6-74f295052770")
    .set("Accept", "application/json")
    .expect(403);
});

test("Test find contact - invalid token", async () => {
  return request("http://localhost:3002")
    .get("/rest/v1/contacts/677e99fd-b854-479f-afa6-74f295052770")
    .set("Authorization", "Bearer FAKE")
    .set("Accept", "application/json")
    .expect(403);
});

test("Test find contact - not found", async () => {
  return request("http://localhost:3002")
    .get("/rest/v1/contacts/a0b445c6-0f05-11e8-8e96-5ffcb5929488")
    .set("Authorization", `Bearer ${await auth.getTokenUser1([ApplicationRoles.LIST_ALL_CONTACTS])}`)
    .set("Accept", "application/json")
    .expect(404)
    .then(async () => {
      await auth.removeUser1Roles([ApplicationRoles.LIST_ALL_CONTACTS]);
    });
});

test("Test find contact - invalid id", async () => {
  return request("http://localhost:3002")
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
    "audit": "No"
  });
  
  return request("http://localhost:3002")
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
  
  return request("http://localhost:3002")
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
  
  return request("http://localhost:3002")
    .put(`/rest/v1/contacts/${updateData.id}`)
    .set("Authorization", "Bearer FAKE")
    .send(updateData)
    .set("Accept", "application/json")
    .expect(403);
});

test("Test update contact - not found", async () => {
  return request("http://localhost:3002")
    .put(`/rest/v1/contacts/5ddca0e8-0f2f-11e8-aaee-fbf8db060bc5`)
    .set("Authorization", `Bearer ${await auth.getTokenUser1([ApplicationRoles.LIST_ALL_CONTACTS])}`)
    .set("Accept", "application/json")
    .then(async () => {
      await auth.removeUser1Roles([ApplicationRoles.LIST_ALL_CONTACTS]);
    });
});

test("Test update contact - malformed", async () => {
  return request("http://localhost:3002")
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
  const accessToken = await auth.getTokenUser1([ApplicationRoles.LIST_ALL_CONTACTS]);
  await operations.createOperationAndWait(await auth.getAdminToken(), "SAP_CONTACT_SYNC");
  
  return request("http://localhost:3002")
    .get("/rest/v1/contacts/6f1cd486-107e-404c-a73f-50cc1fdabdd6")
    .set("Authorization", `Bearer ${accessToken}`)
    .set("Accept", "application/json")
    .expect(200)
    .then(async response => {
      await Promise.all([
        auth.removeUser1Roles([ApplicationRoles.LIST_ALL_CONTACTS]),
        users.resetUsers(["6f1cd486-107e-404c-a73f-50cc1fdabdd6", "677e99fd-b854-479f-afa6-74f295052770"], t),
        database.executeFiles(testDataDir, ["contracts-teardown.sql", "item-groups-teardown.sql", "operation-reports-teardown.sql"])
      ]);

      t.deepEqual(response.body, contactDataSync["6f1cd486-107e-404c-a73f-50cc1fdabdd6"]);
    });
});

test("Test update contact password change", async (t) => {
  t.notOk(await auth.getToken("test1-testrealm1", "fake-password"), "fake password should not return token");
  return request("http://localhost:3002")
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
}); */