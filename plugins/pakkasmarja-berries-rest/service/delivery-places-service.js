/*jshint esversion: 6 */
/* global __dirname */

(() => {
  "use strict";

  const AbstractService = require(`${__dirname}/../abstract-service`);

  /**
   * Abstract base class for DeliveryPlaces REST service
   */
  class AbstractDeliveryPlacesService extends AbstractService {

   /**
    * Find delivery place
    * Finds delivery place by id
    *
    * @param {http.ClientRequest} req client request object
    * @param {http.ServerResponse} res server response object
    **/
    findDeliveryPlace(req, res) {
      res.status(501).send();
    }

   /**
    * Lists delivery places
    * Lists delivery places
    *
    * @param {http.ClientRequest} req client request object
    * @param {http.ServerResponse} res server response object
    **/
    listDeliveryPlaces(req, res) {
      res.status(501).send();
    }

   /**
    * Registers REST routes
    *
    * @param app express object
    **/
    register(app, keycloak) {
      app.get(`/rest/v1${this.toPath('/deliveryPlaces/{id}')}`, [ keycloak.protect() ], this.catchAsync(this.findDeliveryPlace.bind(this)));
      app.get(`/rest/v1${this.toPath('/deliveryPlaces')}`, [ keycloak.protect() ], this.catchAsync(this.listDeliveryPlaces.bind(this)));
    }
  };

  module.exports = AbstractDeliveryPlacesService;

})();

