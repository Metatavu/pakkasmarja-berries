import * as test from "blue-tape";
import * as request from "supertest";
import auth from "./auth";
import users from "./users";
import ApplicationRoles from "../rest/application-roles";
import mail from "./mail";
import database from "./database";
import operations from "./operations";
import { BasicContact, Contact } from "src/rest/model/models";
import TestConfig from "./test-config";
import sapMock from "./sap-mock";

const testDataDir = `${__dirname}/../../src/test/data/`;
const contactDatas = require(`${testDataDir}/contacts.json`);
const contactDataSync = require(`${testDataDir}/contacts-sync.json`);
const contactUpdateMails = require(`${testDataDir}/contact-update-mails.json`);

const testUser1 = "6f1cd486-107e-404c-a73f-50cc1fdabdd6";
const testUser2 = "677e99fd-b854-479f-afa6-74f295052770";
const userWithSapBusinessPartnerCode = "d9d324ca-de2f-4756-86f0-17179aed8969";
const userWithLegacySapId = "040cbeaa-b330-4094-9b7a-c04dea9e2891";

test("Test listing contacts", async (t) => {

  await users.resetUsers([ testUser1, testUser2 ], t);
  const token = await auth.getTokenUser1([ApplicationRoles.LIST_ALL_CONTACTS]);

  return request(TestConfig.HOST)
    .get("/rest/v1/contacts")
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .expect(200)
    .then(async response => {
      await auth.removeUser1Roles([ApplicationRoles.LIST_ALL_CONTACTS]);
      await users.resetUsers([ testUser1, testUser2 ], t);

      const actualResponse: Contact[] = response.body;
      t.equal(actualResponse.length, 7, "Should return 7 contacts");

      t.deepEqual(
        actualResponse.find(c => c.id === testUser1),
        contactDatas[testUser1],
        `Contact ${testUser1} should be the same in response as in test data`
      );
      t.deepEqual(
        actualResponse.find(c => c.id === testUser2),
        contactDatas[testUser2],
        `Contact ${testUser2} should be the same in response as in test data`
      );
    });
});

test("Test listing contacts - search", async (t) => {
  await users.resetUsers([ testUser1, testUser2 ], t);

  return request(TestConfig.HOST)
    .get("/rest/v1/contacts?search=test1@testrealm1.com")
    .set("Authorization", `Bearer ${await auth.getTokenUser1([ApplicationRoles.LIST_ALL_CONTACTS])}`)
    .set("Accept", "application/json")
    .expect(200)
    .then(async response => {
      await auth.removeUser1Roles([ApplicationRoles.LIST_ALL_CONTACTS]);
      t.equal(response.body.length, 1);
      t.deepEqual(contactDatas[testUser1], response.body[0]);
    });
});

test("Test listing contacts - without token", async () => {
  return request(TestConfig.HOST)
    .get("/rest/v1/contacts")
    .set("Accept", "application/json")
    .expect(403)
    .then(() => {});
});

test("Test listing contacts - invalid token", async () => {
  return request(TestConfig.HOST)
    .get("/rest/v1/contacts")
    .set("Authorization", "Bearer FAKE")
    .set("Accept", "application/json")
    .expect(403)
    .then(() => {});
});

test("Test find contact", async (t) => {
  await users.resetUsers([ testUser1, testUser2 ], t);

  return request(TestConfig.HOST)
    .get(`/rest/v1/contacts/${testUser2}`)
    .set("Authorization", `Bearer ${await auth.getTokenUser2()}`)
    .set("Accept", "application/json")
    .expect(200)
    .then(response => {
      t.deepEqual(response.body, contactDatas[testUser2]);
    });
});

test("Test find basic contact", async (t) => {
  await users.resetUsers([ testUser1, testUser2 ], t);

  return request(TestConfig.HOST)
    .get(`/rest/v1/contacts/${testUser2}/basic`)
    .set("Authorization", `Bearer ${await auth.getTokenUser2()}`)
    .set("Accept", "application/json")
    .expect(200)
    .then(response => {
      const expected: BasicContact = {
        id: contactDatas[testUser2].id,
        displayName: contactDatas[testUser2].displayName,
        avatarUrl: contactDatas[testUser2].avatarUrl
      };

      t.deepEqual(response.body, expected);
    });
});

test("Test find contact - without token", async () => {
  return request(TestConfig.HOST)
    .get(`/rest/v1/contacts/${testUser2}`)
    .set("Accept", "application/json")
    .expect(403)
    .then(() => {});
});

test("Test find contact - invalid token", async () => {
  return request(TestConfig.HOST)
    .get(`/rest/v1/contacts/${testUser2}`)
    .set("Authorization", "Bearer FAKE")
    .set("Accept", "application/json")
    .expect(403)
    .then(() => {});
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
  const updateData = Object.assign({}, contactDatas[testUser2], {
    firstName: "Updated first name",
    lastName: "Updated last name",
    companyName: "Updated company name",
    phoneNumbers: ["+123 567 8901"],
    email: "updatedemail@testrealm1.com",
    addresses: [{
      streetAddress: "Updated street",
      postalCode: "98765",
      city: "Updated city"
    }],
    BIC: "DABAIE3D",
    IBAN: "FI1112345600000786",
    taxCode: "FI23456789",
    vatLiable: "EU",
    audit: "No",
    avatarUrl: "https://www.gravatar.com/avatar/0c8a21d448e8e36a88f2f3d63c6cecfdcc4c9981?d=identicon",
    displayName: "Updated first name Updated last name Updated company name"
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
  await users.resetUsers([ testUser2 ], t);

  mail.clearOutbox();
  t.deepEqual(mail.getOutbox().length, 0);

  const updateData = Object.assign({}, contactDatas[testUser2], {
    firstName: "Updated first name",
    lastName: "Updated last name",
    companyName: "Updated company name",
    phoneNumbers: ["+123 567 8901"],
    email: "updatedemail@testrealm1.com",
    addresses: [{
      streetAddress: "Updated street",
      postalCode: "98765",
      city: "Updated city"
    }],
    BIC: "DABAIE3D",
    IBAN: "FI1112345600000786",
    taxCode: "FI23456789",
    vatLiable: "EU",
    audit: "No",
    avatarUrl: "https://www.gravatar.com/avatar/0c8a21d448e8e36a88f2f3d63c6cecfdcc4c9981?d=identicon",
    displayName: "Updated first name Updated last name Updated company name"
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
  const updateData = Object.assign({}, contactDatas[testUser2], {
    firstName: "Updated first name",
    lastName: "Updated last name",
    companyName: "Updated company name",
    phoneNumbers: ["+123 567 8901"],
    email: "updatedemail@testrealm1.com",
    addresses: [{
      streetAddress: "Updated street",
      postalCode: "98765"
    }],
    BIC: "DABAIE3D",
    IBAN: "FI1112345600000786",
    taxCode: "FI23456789",
    vatLiable: "EU",
    audit: "No"
  });

  return request(TestConfig.HOST)
    .put(`/rest/v1/contacts/${updateData.id}`)
    .send(updateData)
    .set("Accept", "application/json")
    .expect(403)
    .then(() => {});
});

test("Test update contact - invalid token", async () => {
  const updateData = Object.assign({}, contactDatas[testUser2], {
    firstName: "Updated first name",
    lastName: "Updated last name",
    companyName: "Updated company name",
    phoneNumbers: ["+123 567 8901"],
    email: "updatedemail@testrealm1.com",
    addresses: [{
      streetAddress: "Updated street",
      postalCode: "98765"
    }],
    BIC: "DABAIE3D",
    IBAN: "FI1112345600000786",
    taxCode: "FI23456789",
    vatLiable: "EU",
    audit: "No"
  });

  return request(TestConfig.HOST)
    .put(`/rest/v1/contacts/${updateData.id}`)
    .set("Authorization", "Bearer FAKE")
    .send(updateData)
    .set("Accept", "application/json")
    .expect(403)
    .then(() => {});
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
    .put(`/rest/v1/contacts/${testUser2}`)
    .set("Authorization", `Bearer ${await auth.getTokenUser2([ApplicationRoles.LIST_ALL_CONTACTS])}`)
    .send("malformed data")
    .set("Accept", "application/json")
    .expect(400)
    .then(async () => {
      await auth.removeUser2Roles([ApplicationRoles.LIST_ALL_CONTACTS]);
    });
});

test("Test sync contact with SAP business partner code", async (t) => {
  await sapMock.mockBusinessPartner("1");

  const accessToken = await auth.getTokenUser1([ApplicationRoles.LIST_ALL_CONTACTS]);
  await operations.createOperationAndWait(await auth.getAdminToken(), "SAP_CONTACT_SYNC");

  return request(TestConfig.HOST)
    .get(`/rest/v1/contacts/${userWithSapBusinessPartnerCode}`)
    .set("Authorization", `Bearer ${accessToken}`)
    .set("Accept", "application/json")
    .expect(200)
    .then(async response => {
      await Promise.all([
        auth.removeUser1Roles([ApplicationRoles.LIST_ALL_CONTACTS]),
        users.resetUsers([ userWithSapBusinessPartnerCode ], t),
        database.executeFiles(testDataDir, ["operation-reports-teardown.sql"]),
        sapMock.deleteMocks()
      ]);

      t.deepEqual(response.body, contactDataSync[userWithSapBusinessPartnerCode], "Contact data should be synced");
    });
});

test("Test sync contact with legacy SAP ID", async (t) => {
  await sapMock.mockBusinessPartner("2");

  const accessToken = await auth.getTokenUser1([ApplicationRoles.LIST_ALL_CONTACTS]);
  await operations.createOperationAndWait(await auth.getAdminToken(), "SAP_CONTACT_SYNC");

  return request(TestConfig.HOST)
    .get(`/rest/v1/contacts/${userWithLegacySapId}`)
    .set("Authorization", `Bearer ${accessToken}`)
    .set("Accept", "application/json")
    .expect(200)
    .then(async response => {
      await Promise.all([
        auth.removeUser1Roles([ApplicationRoles.LIST_ALL_CONTACTS]),
        users.resetUsers([ userWithLegacySapId ], t),
        database.executeFiles(testDataDir, ["operation-reports-teardown.sql"]),
        sapMock.deleteMocks()
      ]);

      t.deepEqual(response.body, contactDataSync[userWithLegacySapId], "Contact data should be synced");
    });
});

test("Test update contact password change", async (t) => {
  t.notOk(await auth.getToken("test1-testrealm1", "fake-password"), "fake password should not return token");
  return request(TestConfig.HOST)
    .put(`/rest/v1/contacts/${testUser1}/credentials`)
    .set("Authorization", `Bearer ${await auth.getTokenUser1()}`)
    .send({ "password": "fake-password" })
    .set("Accept", "application/json")
    .expect(204)
    .then(async() => {
      t.notOk(await auth.getToken("test1-testrealm1", "test"), "Initial password should not return token after reset");
      t.ok(await auth.getToken("test1-testrealm1", "fake-password"), "updated password should return token");
      await users.resetUserPassword(testUser1, "test1-testrealm1", "fake-password", "test");
    });
});