/*jshint esversion: 6 */
/* global __dirname */

(() => {
  "use strict";

  const test = require("blue-tape");
  const request = require("supertest");
  const auth = require(`${__dirname}/auth`);
  const database = require(`${__dirname}/database`);
  const operations = require(`${__dirname}/operations`);
  const contactDatas = require(`${__dirname}/data/contacts.json`);
  const contactDataSync = require(`${__dirname}/data/contacts-sync.json`);
  
  /**
   * Resets user back to original state
   * 
   * @param {String} userId
   * @return {Promise} promise
   */
  async function resetUser(userId, t) {
    const user = contactDatas[userId];
   
    return request("http://localhost:3002")
      .put(`/rest/v1/contacts/${user.id}`)
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .send(user)
      .set("Accept", "application/json")
      .expect(200)
      .then(response => {
        t.deepEqual(response.body, user);
      });
  }
  
  test("Test listing contacts", async (t) => {
    return request("http://localhost:3002")
      .get("/rest/v1/contacts")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .expect(200)
      .then(response => {
        t.equal(response.body.length, 2);
        t.deepEqual(response.body[0], contactDatas["6f1cd486-107e-404c-a73f-50cc1fdabdd6"]);
        t.deepEqual(response.body[1], contactDatas["677e99fd-b854-479f-afa6-74f295052770"]);
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
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
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
  
  test("Test find contact not found", async () => {
    return request("http://localhost:3002")
      .get("/rest/v1/contacts/a0b445c6-0f05-11e8-8e96-5ffcb5929488")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .expect(404);
  });
  
  test("Test find contact invalid id", async () => {
    return request("http://localhost:3002")
      .get("/rest/v1/contacts/not-uuid")
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .set("Accept", "application/json")
      .expect(404);
  });
  
  test("Test update contact", async (t) => {
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
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .send(updateData)
      .set("Accept", "application/json")
      .expect(200)
      .then(response => {
        t.deepEqual(response.body, updateData);
        return resetUser(updateData.id, t);
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
  
  test("Test update contact not found", async () => {
    return request("http://localhost:3002")
      .put(`/rest/v1/contacts/5ddca0e8-0f2f-11e8-aaee-fbf8db060bc5`)
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .send(contactDatas["677e99fd-b854-479f-afa6-74f295052770"])
      .set("Accept", "application/json")
      .expect(404);
  });
  
  test("Test update contact malformed", async (t) => {
    return request("http://localhost:3002")
      .put(`/rest/v1/contacts/677e99fd-b854-479f-afa6-74f295052770`)
      .set("Authorization", `Bearer ${await auth.getTokenDefault()}`)
      .send("malformed data")
      .set("Accept", "application/json")
      .expect(400);
  });

  test("Test sync contact", async (t) => {
    const accessToken = await auth.getTokenDefault();
    await operations.createOperationAndWait(accessToken, "SAP_CONTACT_SYNC");
    
    return request("http://localhost:3002")
      .get("/rest/v1/contacts/6f1cd486-107e-404c-a73f-50cc1fdabdd6")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("Accept", "application/json")
      .expect(200)
      .then(async response => {
        t.deepEqual(response.body, contactDataSync["6f1cd486-107e-404c-a73f-50cc1fdabdd6"]);
        await Promise.all([
          resetUser("6f1cd486-107e-404c-a73f-50cc1fdabdd6", t), 
          resetUser("677e99fd-b854-479f-afa6-74f295052770", t),
          database.executeFiles(`${__dirname}/data`, ["contracts-teardown.sql", "item-groups-teardown.sql", "operation-reports-teardown.sql"])
        ]);
      });
  });
  
})();