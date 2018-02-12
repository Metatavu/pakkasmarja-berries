/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';

  const test = require('blue-tape');
  const request = require('supertest');
  const database = require(`${__dirname}/database`);
  const contractDatas = require(`${__dirname}/data/contracts.json`);
  
  test('Test listing contracts', async (t) => {
    await database.executeFiles(`${__dirname}/data`, ['item-groups-setup.sql', 'contracts-setup.sql']);
    
    return request('http://localhost:3002')
      .get('/rest/v1/contracts')
      .set('Accept', 'application/json')
      .expect(200)
      .then(async response => {
        t.equal(response.body.length, 2);
        t.deepEqual(response.body[0], contractDatas["1d45568e-0fba-11e8-9ac4-a700da67a976"]);
        t.deepEqual(response.body[1], contractDatas["3950f496-0fba-11e8-9611-0b2da5ab56ce"]);
        await database.executeFiles(`${__dirname}/data`, ['contracts-teardown.sql', 'item-groups-teardown.sql']);
      });
  });
  
  test('Test finding contracts', async (t) => {
    await database.executeFiles(`${__dirname}/data`, ['item-groups-setup.sql', 'contracts-setup.sql']);
    
    return request('http://localhost:3002')
      .get('/rest/v1/contracts/1d45568e-0fba-11e8-9ac4-a700da67a976')
      .set('Accept', 'application/json')
      .expect(200)
      .then(async response => {
        await database.executeFiles(`${__dirname}/data`, ['contracts-teardown.sql', 'item-groups-teardown.sql']);
        t.deepEqual(response.body, contractDatas["1d45568e-0fba-11e8-9ac4-a700da67a976"]);
      });
  });
  
  test('Test finding contract - not found', async (t) => {
    await database.executeFiles(`${__dirname}/data`, ['item-groups-setup.sql', 'contracts-setup.sql']);
    
    return request('http://localhost:3002')
      .get('/rest/v1/contracts/c74e5468-0fb1-11e8-a4e2-87868e24ee8b')
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
      .set('Accept', 'application/json')
      .expect(404)
      .then(async response => {
        await database.executeFiles(`${__dirname}/data`, ['contracts-teardown.sql', 'item-groups-teardown.sql']);
      });
  });
  
})();