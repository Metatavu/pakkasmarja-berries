/*jshint esversion: 6 */
/* global __dirname */

(() => {
  "use strict";

  const database = require(`${__dirname}/database`);
  const test = require("blue-tape");
  const request = require("supertest");
  const auth = require(`${__dirname}/auth`);
  const securityAsserts = require(`${__dirname}/data/security-asserts.js`);
  const restPaths = require(`${__dirname}/data/rest-paths.json`);

  restPaths.forEach((restPath) => {
    const operationId = restPath.operationId;
    const pathTemplate = restPath.path;
    const method = restPath.method;
    const testSettings = securityAsserts[operationId];

    test(`Test security is tested on ${operationId}`, async (t) => {
      t.ok(!!testSettings, `Operation ${operationId} should have tests`);
    });

    testSettings.forEach((testSetting) => {

      const path = "/rest/v1" + pathTemplate.replace(/\{(.*?)\}/g, (match, param) => { 
        return testSetting.params[param];
      });

      test(`Test security on ${method} ${path}`, async (t) => {
        if (testSetting.database && testSetting.database.setup) {
          await database.executeFiles(`${__dirname}/data`, testSetting.database.setup);
        }

        let token = null;

        if (testSetting["with-user"]) {
          token = await auth.getToken(testSetting["with-user"], "test");
        }

        let result = request("http://localhost:3002");

        switch (method) {
          case "post":
            result = result.post(path).send({});
          break;
          case "get":
            result = result.get(path);
          break;
          case "put":
            result = result.put(path).send({});
          break;
          case "delete":
            result = result.delete(path);
          break;
        }

        if (testSetting.query) {
          result = result.query(testSetting.query);
        }

        if (testSetting.body) {
          result = result.send(testSetting.body);
        }

        return result
          .set("Authorization", `Bearer ${token}`)
          .set("Accept", "application/json")
          .send({})
          .then(async response => {
            if (testSetting.database && testSetting.database.teardown) {
              await database.executeFiles(`${__dirname}/data`, testSetting.database.teardown);
            }

            t.equals(response.statusCode, testSetting.expectStatus, testSetting.message);
          });
      });
    
    });

  });

})();