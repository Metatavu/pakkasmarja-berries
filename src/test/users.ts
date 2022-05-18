import { Test } from "blue-tape";
import * as request from "supertest";
import * as path from "path";
import auth from "./auth";
import TestConfig from "./test-config";

const testDataDir = `${__dirname}/../../src/test/data/`;
const contactDatas = require(path.resolve(testDataDir, 'contacts.json'));

/**
 * Users utility class for tests
 */
export default new class Users {

  /**
   * Resets user back to original state
   *
   * @param {String} userId
   * @param {Object} t tape
   * @return {Promise} promise
   */
  async resetUser(userId: string, t: Test) {
    const user = contactDatas[userId];

    return request(TestConfig.HOST)
      .put(`/rest/v1/contacts/${user.id}`)
      .set("Authorization", `Bearer ${await auth.getAdminToken()}`)
      .send(user)
      .set("Accept", "application/json")
      .expect(200)
      .then(response => {
        t.deepEqual(response.body, user, "user should be reset back to original state");
      });
  }

  /**
   * Resets users password
   *
   * @param {String} userId
   * @param {String} userName
   * @param {String} oldPassword
   * @param {String} newPassword
   * @return {Promise} promise
   */
  async resetUserPassword(userId: string, userName: string, oldPassword: string, newPassword: string) {
    return request(TestConfig.HOST)
      .put(`/rest/v1/contacts/${userId}/credentials`)
      .set("Authorization", `Bearer ${await auth.getToken(userName, oldPassword)}`)
      .send({ "password": newPassword })
      .set("Accept", "application/json")
      .expect(204);
  }

  /**
   * Resets users back to original state
   *
   * @param {String} userId
   * @param {Object} t tape
   * @return {Promise} promise
   */
  resetUsers(userIds: string[], t: Test) {
    return Promise.all(userIds.map((userId) => {
      return this.resetUser(userId, t);
    }));
  }

}