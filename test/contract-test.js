/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';

  const fs = require('fs');
  const test = require('blue-tape');
  const request = require('supertest');
  const database = require(`${__dirname}/database`);
  const pdf = require(`${__dirname}/pdf`);
  const auth = require(`${__dirname}/auth`);
  const contractDatas = require(`${__dirname}/data/contracts.json`);
  
  /* jshint ignore:start */
  test('Test listing contracts', async (t) => {
    await database.executeFiles(`${__dirname}/data`, ['item-groups-setup.sql', 'contracts-setup.sql']);

    return request('http://localhost:3002')
      .get('/rest/v1/contracts')
      .set('Authorization', `Bearer ${await auth.getTokenDefault()}`)
      .set('Accept', 'application/json')
      .expect(200)
      .then(async response => {
        t.equal(response.body.length, 2);
        t.deepEqual(response.body[0], contractDatas["1d45568e-0fba-11e8-9ac4-a700da67a976"]);
        t.deepEqual(response.body[1], contractDatas["3950f496-0fba-11e8-9611-0b2da5ab56ce"]);
        await database.executeFiles(`${__dirname}/data`, ['contracts-teardown.sql', 'item-groups-teardown.sql']);
      });
  });
  
  test('Test listing contracts - without token', async (t) => {
    await database.executeFiles(`${__dirname}/data`, ['item-groups-setup.sql', 'contracts-setup.sql']);

    return request('http://localhost:3002')
      .get('/rest/v1/contracts')
      .set('Accept', 'application/json')
      .expect(403)
      .then(async response => {
        await database.executeFiles(`${__dirname}/data`, ['contracts-teardown.sql', 'item-groups-teardown.sql']);
      });
  });
  
  test('Test listing contracts - invalid token', async (t) => {
    await database.executeFiles(`${__dirname}/data`, ['item-groups-setup.sql', 'contracts-setup.sql']);

    return request('http://localhost:3002')
      .get('/rest/v1/contracts')
      .set('Authorization', 'Bearer FAKE')
      .set('Accept', 'application/json')
      .expect(403)
      .then(async response => {
        await database.executeFiles(`${__dirname}/data`, ['contracts-teardown.sql', 'item-groups-teardown.sql']);
      });
  });
  
  test('Test finding contracts', async (t) => {
    await database.executeFiles(`${__dirname}/data`, ['item-groups-setup.sql', 'contracts-setup.sql']);
    
    return request('http://localhost:3002')
      .get('/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976')
      .set('Authorization', `Bearer ${await auth.getTokenDefault()}`)
      .set('Accept', 'application/json')
      .expect(200)
      .then(async response => {
        await database.executeFiles(`${__dirname}/data`, ['contracts-teardown.sql', 'item-groups-teardown.sql']);
        t.deepEqual(response.body, contractDatas["1d45568e-0fba-11e8-9ac4-a700da67a976"]);
      });
  });
  
  test('Test finding contracts - without token', async (t) => {
    await database.executeFiles(`${__dirname}/data`, ['item-groups-setup.sql', 'contracts-setup.sql']);
    
    return request('http://localhost:3002')
      .get('/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976')
      .set('Accept', 'application/json')
      .expect(403)
      .then(async response => {
        await database.executeFiles(`${__dirname}/data`, ['contracts-teardown.sql', 'item-groups-teardown.sql']);
      });
  });
  
  test('Test finding contracts - invalid token', async (t) => {
    await database.executeFiles(`${__dirname}/data`, ['item-groups-setup.sql', 'contracts-setup.sql']);
    
    return request('http://localhost:3002')
      .get('/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976')
      .set('Authorization', 'Bearer FAKE')
      .set('Accept', 'application/json')
      .expect(403)
      .then(async response => {
        await database.executeFiles(`${__dirname}/data`, ['contracts-teardown.sql', 'item-groups-teardown.sql']);
      });
  });
  
  test('Test finding contract - not found', async (t) => {
    await database.executeFiles(`${__dirname}/data`, ['item-groups-setup.sql', 'contracts-setup.sql']);
    
    return request('http://localhost:3002')
      .get('/rest/v1/contracts/c74e5468-0fb1-11e8-a4e2-87868e24ee8b')
      .set('Authorization', `Bearer ${await auth.getTokenDefault()}`)
      .set('Accept', 'application/json')
      .expect(404)
      .then(async response => {
        await database.executeFiles(`${__dirname}/data`, ['contracts-teardown.sql', 'item-groups-teardown.sql']);
      });
  });
  
  test('Test finding contract - malformed id', async (t) => {
    await database.executeFiles(`${__dirname}/data`, ['item-groups-setup.sql', 'contracts-setup.sql']);
    
    return request('http://localhost:3002')
      .get('/rest/v1/contracts/not-uuid')
      .set('Authorization', `Bearer ${await auth.getTokenDefault()}`)
      .set('Accept', 'application/json')
      .expect(404)
      .then(async response => {
        await database.executeFiles(`${__dirname}/data`, ['contracts-teardown.sql', 'item-groups-teardown.sql']);
      });
  });
  
  test('Test contract pdf', async (t) => {
    await database.executeFiles(`${__dirname}/data`, ['item-groups-setup.sql', 'contracts-setup.sql', 'contract-documents-setup.sql']);
    
    return request('http://localhost:3002')
      .get('/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976/documents/master?format=PDF')
      .set('Authorization', `Bearer ${await auth.getTokenDefault()}`)
      .set('Accept', 'application/json')
      .expect(200)
      .then(async response => {
        await database.executeFiles(`${__dirname}/data`, ['contract-documents-teardown.sql', 'contracts-teardown.sql', 'item-groups-teardown.sql']);
        await pdf.extractPdfDataFromBuffer(response.body)
          .then((pdfData) => {
            t.ok(pdfData.rawTextContent.indexOf("1 (1)") > -1, "Contains header page number");
            t.ok(pdfData.rawTextContent.indexOf("Example Co. (company in future)") > -1, "Contains replaced company name");
            t.ok(pdfData.rawTextContent.indexOf("https://www.example.com") > -1, "contains footer");
          });
      });
  });
  
  test('Test contract pdf - item group', async (t) => {
    await database.executeFiles(`${__dirname}/data`, ['item-groups-setup.sql', 'contracts-setup.sql', 'contract-documents-setup.sql']);
    
    return request('http://localhost:3002')
      .get('/rest/v1/contracts/3950f496-0fba-11e8-9611-0b2da5ab56ce/documents/group?format=PDF')
      .set('Authorization', `Bearer ${await auth.getTokenDefault()}`)
      .set('Accept', 'application/json')
      .expect(200)
      .then(async response => {
        await database.executeFiles(`${__dirname}/data`, ['contract-documents-teardown.sql', 'contracts-teardown.sql', 'item-groups-teardown.sql']);
        await pdf.extractPdfDataFromBuffer(response.body)
          .then((pdfData) => {
            t.ok(pdfData.rawTextContent.indexOf("Example group purchase contract") > -1, "Contains contents");
          });
      });
  });
  
  test('Test contract pdf - without token', async (t) => {
    await database.executeFiles(`${__dirname}/data`, ['item-groups-setup.sql', 'contracts-setup.sql']);
    
    return request('http://localhost:3002')
      .get('/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976/documents/master?format=PDF')
      .set('Accept', 'application/json')
      .expect(403)
      .then(async response => {
        await database.executeFiles(`${__dirname}/data`, ['contracts-teardown.sql', 'item-groups-teardown.sql']);
      });
  });
  
  test('Test contract pdf - invalid token', async (t) => {
    await database.executeFiles(`${__dirname}/data`, ['item-groups-setup.sql', 'contracts-setup.sql']);
    
    return request('http://localhost:3002')
      .get('/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976/documents/master?format=PDF')
      .set('Authorization', 'Bearer FAKE')
      .set('Accept', 'application/json')
      .expect(403)
      .then(async response => {
        await database.executeFiles(`${__dirname}/data`, ['contracts-teardown.sql', 'item-groups-teardown.sql']);
      });
  });
  /* jshint ignore:end */
  
})();