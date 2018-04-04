/*jshint esversion: 6 */
/* global __dirname */

(() => {
  "use strict";

  const request = require("supertest");
  const auth = require(`${__dirname}/auth`);
  const contactDatas = require(`${__dirname}/data/contacts.json`);
  
  /**
   * Users utility class for tests
   */
  class Users {
    
    /**
     * Resets user back to original state
     * 
     * @param {String} userId
     * @param {Object} t tape
     * @return {Promise} promise
     */
    async resetUser(userId, t) {
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
    
    /**
     * Resets users password
     * 
     * @param {String} userId
     * @param {String} userName
     * @param {String} oldPassword  
     * @param {String} newPassword
     * @return {Promise} promise
     */
    async resetUserPassword(userId, userName, oldPassword, newPassword) {
      return request("http://localhost:3002")
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
    resetUsers(userIds, t) {
      return Promise.all(userIds.map((userId) => {
        return this.resetUser(userId, t);
      }));
    }

  }
  
  module.exports = new Users();
  
})();