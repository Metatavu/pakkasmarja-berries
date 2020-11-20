import config from "./config";
import * as test from "blue-tape"; 
import * as request from "supertest";
import auth from "./auth";
import database from "./database";

const testDataDir = `${__dirname}/../../src/test/data/`;

const securityAsserts = require(`${testDataDir}/security-asserts.js`);
const restPaths = require(`${testDataDir}/rest-paths.json`);

interface RestPath {
  operationId: string,
  path: string,
  method: string
}

restPaths.forEach((restPath: RestPath) => {
  const operationId = restPath.operationId;
  const pathTemplate = restPath.path;
  const method = restPath.method;
  const testSettings = securityAsserts[operationId];

  test(`Test security is tested on ${operationId}`, async (t) => {
    t.ok(!!testSettings, `Operation ${operationId} should have tests`);
  });

  testSettings.forEach((testSetting: any) => {

    const path = "/rest/v1" + pathTemplate.replace(/\{(.*?)\}/g, (match, param) => { 
      return testSetting.params[param];
    });

    test(`Test security on ${method} ${path}`, async (t) => {
      if (testSetting.database && testSetting.database.setup) {
        await database.executeFiles(testDataDir, testSetting.database.setup);
      }

      let token = null;

      if (testSetting["with-user"]) {
        token = await auth.getToken(testSetting["with-user"], "test");
      }

      let result: any = request(config.get("baseUrl"));

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
        .then(async (response: any) => {
          if (testSetting.database && testSetting.database.teardown) {
            await database.executeFiles(testDataDir, testSetting.database.teardown);
          }

          t.equals(response.statusCode, testSetting.expectStatus, testSetting.message);
        });
    });
  
  });

});