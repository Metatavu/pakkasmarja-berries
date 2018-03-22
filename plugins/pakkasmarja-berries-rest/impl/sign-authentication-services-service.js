/*jshint esversion: 6 */
/* global __dirname */

(() => {
  "use strict";

  const AbstractSignAuthenticationServicesService = require(`${__dirname}/../service/sign-authentication-services-service`);
  const SignAuthenticationService = require(`${__dirname}/../model/sign-authentication-service`);
  
  /**
   * Implementation for SignAuthenticationService REST service
   */
  class SignAuthenticationServicesServiceImpl extends AbstractSignAuthenticationServicesService {
    
    /**
     * Constructor for SignAuthenticationServiceService service
     * 
     * @param {Object} logger logger
     * @param {Object} signature Digital signature functionalities
     */
    constructor (logger, signature) {
      super();
      this.logger = logger;
      this.signature = signature;
    }

    /**
     * @inheritDoc 
     */
    async listSignAuthenticationServices(req, res) {
      const authenticationMethods = await this.signature.getAuthenticationMethods();
      const result = authenticationMethods.methods.map((method) => {
        return SignAuthenticationService.constructFromObject(method);
      });

      res.status(200).send(result);
    }

  }

  module.exports = SignAuthenticationServicesServiceImpl;

})();

