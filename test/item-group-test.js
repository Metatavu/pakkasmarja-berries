/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';

  const test = require('blue-tape');
  const request = require('supertest');
  const database = require(`${__dirname}/database`);
  const itemGroupDatas = require(`${__dirname}/data/item-groups.json`);
  
  test('Test listing item groups', async (t) => {
    await database.executeFile(`${__dirname}/data/item-groups-setup.sql`);
    
    return request('http://localhost:3002')
      .get('/rest/v1/itemGroups')
      .set('Accept', 'application/json')
      .expect(200)
      .then(async response => {
        t.equal(response.body.length, 2);
        t.deepEqual(response.body[0], itemGroupDatas["89723408-0f51-11e8-baa0-dfe7c7eae257"]);
        t.deepEqual(response.body[1], itemGroupDatas["98be1d32-0f51-11e8-bb59-3b8b6bbe9a20"]);
        
        await database.executeFile(`${__dirname}/data/item-groups-teardown.sql`);
      });
  });
  
})();