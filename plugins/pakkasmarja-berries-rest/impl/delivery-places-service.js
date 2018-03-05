/*jshint esversion: 6 */
/* global __dirname */

(() => {
  'use strict';

  const _ = require('lodash');
  const AbstractDeliveryPlacesService = require(`${__dirname}/../service/delivery-places-service`);
  const DeliveryPlace = require(`${__dirname}/../model/delivery-place`);

  /**
   * Implementation for DeliveryPlaces REST service
   */
  class DeliveryPlacesServiceImpl extends AbstractDeliveryPlacesService {
    
    /**
     * Constructor for DeliveryPlaces service
     * 
     * @param {Object} logger logger
     * @param {Object} models models
     */
    constructor (logger, models) {
      super();
      
      this.logger = logger;
      this.models = models;
    }
    
    /* jshint ignore:start */
    async findDeliveryPlace(req, res) {
      const deliveryPlaceId = req.params.id;
      if (!deliveryPlaceId) {
        this.sendNotFound(res);
        return;
      }
      
      const databaseDeliveryPlace = await this.models.findDeliveryPlaceByExternalId(deliveryPlaceId);
      if (!databaseDeliveryPlace) {
        this.sendNotFound(res);
        return;
      }
      
      res.status(200).send(this.translateDatabaseDeliveryPlace(databaseDeliveryPlace));
    }
    /* jshint ignore:end */
    
    /**
     * @inheritdoc
     */
    /* jshint ignore:start */
    async listDeliveryPlaces(req, res) {
      const databaseDeliveryPlaces = await this.models.listDeliveryPlaces();
      const deliveryPlaces = databaseDeliveryPlaces.map((databaseDeliveryPlace) => {
        return this.translateDatabaseDeliveryPlace(databaseDeliveryPlace);
      });
      
      res.status(200).send(deliveryPlaces);
    }
    /* jshint ignore:end */
    
    /**
     * Translates Database delivery place into REST entity
     * 
     * @param {Object} deliveryPlace Sequelize delivery place model
     * @return {DeliveryPlace} REST entity
     */
    translateDatabaseDeliveryPlace(deliveryPlace) {
      return DeliveryPlace.constructFromObject({
        'id': deliveryPlace.externalId,
        'name': deliveryPlace.name
      });
    }
  }

  module.exports = DeliveryPlacesServiceImpl;

})();

