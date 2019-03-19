import { Response, Request, Application } from "express";
import { config } from "../config";
import * as fs from "fs";

/**
 * System routes
 */
export default class SystemRoutes {
  
  constructor (app: Application) {
    app.get("/system/ping", this.getSystemPing.bind(this));
    app.get("/system/app-config.json", this.getAppConfig.bind(this));
    app.post("/system/shutdown", this.postSystemShutdown.bind(this));
  }
  
  /**
   * Responds PONG
   *
   * @param req client request object
   * @param res server response object
   */
  public getSystemPing(req: Request, res: Response) {
    res.send("PONG");
  }
  
  /**
   * Returns app config
   *
   * @param req client request object
   * @param res server response object
   */
  public getAppConfig(req: Request, res: Response) {
    fs.readFile(`${__dirname}/../../app-config.json`, (err, file) => {
      if (err) {
        res.status(500).send(err);
      } else {
        res.header("Content-Type", "application/json");
        res.send(file);
      }
    });
  }
  

  /**
   * Shutdown system
   * Shuts the system down
   *
   * @param req client request object
   * @param res server response object
   **/
  public postSystemShutdown(req: Request, res: Response) {
    if (config().mode !== "TEST") {
      res.status(403).send("I\"m sorry Dave, I\"m afraid I can\"t do that");
      return;
    }
    
    try {
      res.status(204).send();
    } finally {
      process.exit(0);
    }
  }
};