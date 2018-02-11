/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';

  const test = require('blue-tape');
  const request = require('supertest');
  const contactDatas = require(`${__dirname}/data/contacts.json`);
  
  /**
   * Resets user back to original state
   * 
   * @param {String} userId
   * @return {Promise} promise
   */
  function resetUser(userId, t) {
    const user = contactDatas[userId];
   
    return request('http://localhost:3002')
      .put(`/rest/v1/contacts/${user.id}`)
      .send(user)
      .set('Accept', 'application/json')
      .expect(200)
      .then(response => {
        t.deepEqual(response.body, user);
      });
  }
  
  test('Test listing contacts', (t) => {
    return request('http://localhost:3002')
      .get('/rest/v1/contacts')
      .set('Accept', 'application/json')
      .expect(200)
      .then(response => {
        t.equal(response.body.length, 2);
        t.deepEqual(response.body[0], contactDatas["6f1cd486-107e-404c-a73f-50cc1fdabdd6"]);
        t.deepEqual(response.body[1], contactDatas["677e99fd-b854-479f-afa6-74f295052770"]);
      });
  });
  
  test('Test find contact', (t) => {
    return request('http://localhost:3002')
      .get('/rest/v1/contacts/677e99fd-b854-479f-afa6-74f295052770')
      .set('Accept', 'application/json')
      .expect(200)
      .then(response => {
        t.deepEqual(response.body, contactDatas["677e99fd-b854-479f-afa6-74f295052770"]);
      });
  });
  
  test('Test find contact not found', () => {
    return request('http://localhost:3002')
      .get('/rest/v1/contacts/a0b445c6-0f05-11e8-8e96-5ffcb5929488')
      .set('Accept', 'application/json')
      .expect(404);
  });
  
  test('Test find contact invalid id', () => {
    return request('http://localhost:3002')
      .get('/rest/v1/contacts/not-uuid')
      .set('Accept', 'application/json')
      .expect(404);
  });
  
  test('Test update contact', (t) => {
    const updateData = Object.assign({}, contactDatas["677e99fd-b854-479f-afa6-74f295052770"], {
      "sapId": "updated sap id",
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
   
    return request('http://localhost:3002')
      .put(`/rest/v1/contacts/${updateData.id}`)
      .send(updateData)
      .set('Accept', 'application/json')
      .expect(200)
      .then(response => {
        t.deepEqual(response.body, updateData);
        return resetUser(updateData.id, t);
      });
  });
  
  
  
  
})();