import { Response, Request, Application } from "express";
import { config } from "../config";
import * as uuid from "uuid4";
import * as multer from "multer";
import * as Keycloak from "keycloak-connect";

/**
 * File routes
 */
export default class FileRoutes {
  
  constructor (app: Application, keycloak: Keycloak) {
    const upload = multer({storage: this.getStorage()});
    app.get("/files/:fileId", [ keycloak.protect() ], this.getFileData.bind(this));
    app.post("/upload", [ keycloak.protect(), upload.single("file") ], this.postFileUpload.bind(this));
  }

  /**
   * Responds with image data
   *
   * @param req client request object
   * @param res server response object
   */
  public getFileData(req: Request, res: Response) {
    const fileId = req.params.fileId;
    let path = config().uploadDirectory;
    if (path.endsWith("/")) {
      path = path.slice(0, -1);
    }

    res.sendFile(`${path}/${fileId}`);
  }
  
  /**
   * Handles file upload
   *
   * @param req client request object
   * @param res server response object
   */
  public postFileUpload(req: Request, res: Response) {
    res.send({
      url: `${this.getBaseUrl()}/files/${req.file.filename}`
    });
  }

  /**
   * Creates multer storage engine
   */
  private getStorage(): multer.StorageEngine {
    return multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, config().uploadDirectory)
      },
      filename: (req, file, cb) => {
        const filename = file.filename;
        const extension = filename.indexOf(".") > -1 ? filename.substr(filename.lastIndexOf('.') + 1) : "";
        cb(null, `${uuid()}.${extension}}`)
      }
    });
  }

  /**
   * Returns server base url for the client
   */
  private getBaseUrl() {
    const host = config().client.server.host;
    const secure = config().client.server.secure;
    const port = config().client.server.port;
    const protocol = secure ? "https" : "http";
    return `${protocol}://${host}:${port}`;
  }

};