import { Response, Request, Application } from "express";
import { Keycloak } from "keycloak-connect";
import { config } from "../config";

/**
 * Mqtt routes
 */
export default class MqttRoutes {
  
  constructor (app: Application, keycloak: Keycloak) {
    app.get("/mqtt/connection", [ keycloak.protect() ], this.getMqttConnection.bind(this));
  }

  /**
   * Responds with MQTT connction details
   * 
   * @param req request
   * @param res response
   */
  private getMqttConnection(req: Request, res: Response) {
    res.send(config().mqtt);
  }

};