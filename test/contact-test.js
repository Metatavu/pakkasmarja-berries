'use strict';

const test = require('blue-tape');
const request = require('supertest');

test('Test listing contacts', (t) => {
  return request('http://localhost:3002')
    .get('/rest/v1/contacts')
    .set('Accept', 'application/json')
    .expect(200)
    .then(response => {
      t.equal(response.body.length, 2);
      
      t.deepEqual(response.body[0], { 
        id: '6f1cd486-107e-404c-a73f-50cc1fdabdd6',
        sapId: null,
        firstName: 'Test 1',
        lastName: 'User 1',
        companyName: null,
        phoneNumbers: [],
        email: 'test1@testrealm1.com',
        addresses: [],
        BIC: null,
        IBAN: null,
        taxCode: null,
        vatLiable: null,
        audit: null 
      });

      t.deepEqual(response.body[1], {
        id: '677e99fd-b854-479f-afa6-74f295052770',
        sapId: 'tusap2',
        firstName: 'Test 2',
        lastName: 'User 2',
        companyName: 'Test Corp.',
        phoneNumbers: [ '+358 12 345 6789', '+358 23 456 7890' ],
        email: 'test2@testrealm1.com',
        addresses: [ { streetAddress: '20200', postalCode: '10100' } ],
        BIC: 'DABAIE2D',
        IBAN: 'FI2112345600000786',
        taxCode: 'FI12345678',
        vatLiable: null,
        audit: 'YES'
      });
    });s

});