import { Response, Request, Application } from "express";
import { config } from "../config";

/**
 * System routes
 */
export default class SystemRoutes {
  
  constructor (app: Application) {
    app.get("/system/ping", this.getSystemPing.bind(this));
    app.post("/system/shutdown", this.postSystemShutdown.bind(this));
  }
  
  /**
   * Responds PONG
   *
   * @param req client request object
   * @param res server response object
   */
  getSystemPing(req: Request, res: Response) {
    res.send("PONG");
  }

  /**
   * Shutdown system
   * Shuts the system down
   *
   * @param req client request object
   * @param res server response object
   **/
  postSystemShutdown(req: Request, res: Response) {
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