import { Application, Response, Request } from "express";
import * as Keycloak from "keycloak-connect";
import ApplicationRoles from "../application-roles";
import AWS = require("aws-sdk");
import { Logger, getLogger } from "log4js";
import SharedFilesService from "../api/sharedFiles.service";
import { SharedFile } from "../model/sharedFile";
import { FileType } from "../model/fileType";
import { S3 } from "aws-sdk";
import fileType = require("file-type");

/**
 * Implementation for sharedFiles REST service
 */
export default class SharedFilesServiceImpl extends SharedFilesService {
  private logger: Logger = getLogger();
  private s3: S3 = new S3({ apiVersion: '2006-03-01' });
  private bucket = process.env.AWS_S3_BUCKET;

  /**
   * Constructor
   *
   * @param app Express app
   * @param keycloak Keycloak
   */
  constructor(app: Application, keycloak: Keycloak) {
    super(app, keycloak);
    AWS.config.update({
      region: process.env.AWS_IAM_REGION || ""
    });

    if (!AWS.config.credentials) {
      this.logger.info("AWS: Undefined credentials");
    }
  }

  /**
   * @inheritdoc
   */
  public async listSharedFiles(req: Request, res: Response) {
    const pathPrefix = req.query.pathPrefix || "";
    if (!this.bucket) {
      this.sendInternalServerError(res, "S3 bucket name not found");
      return;
    }

    const s3Params: AWS.S3.ListObjectsV2Request = {
      Bucket: this.bucket,
      Prefix: pathPrefix,
      Delimiter: "/"
    }

    this.s3.listObjectsV2(s3Params, async (error, data) => {
      if (error) {
        this.sendInternalServerError(res, error);
        return;
      }

      if (!data.Contents) {
        this.sendInternalServerError(res, "listSharedFiles: Contents property was undefined in S3 response");
        return;
      }

      const fileHeadLoadPromises = data.Contents.filter(item => item.Key !== pathPrefix).map((object) => this.loadDataHead(object));
      const files: SharedFile[] = await Promise.all(fileHeadLoadPromises);
      const folders = data.CommonPrefixes;
      if (folders && folders.length > 0) {
        folders.forEach(folder => {
          if (this.parsePathFromKey(folder.Prefix || "") === pathPrefix) {
            files.push({
              name: this.parseFileNameFromKey(folder.Prefix || ""),
              pathPrefix: pathPrefix,
              fileType: FileType.FOLDER
            });
          }
        });
      }
      res.send(files);
    });
  }

  /**
   * @inheritdoc
   */
  public async getSharedFile(req: Request, res: Response) {
    const pathPrefix = req.query.pathPrefix;
    const fileName = req.query.fileName;

    if (!fileName) {
      this.sendBadRequest(res, "Query parameter for fileName was not given");
      return;
    }

    if (!this.bucket) {
      this.sendInternalServerError(res, "S3 bucket name not found");
      return;
    }

    const fullPath = pathPrefix ? `${pathPrefix}${fileName}` : fileName;
    const s3Params: AWS.S3.GetObjectRequest = {
      Bucket: this.bucket,
      Key: fullPath
    }

    this.s3.getObject(s3Params, (error, data) => {
      if (error) {
        this.sendInternalServerError(res, error);
        return;
      }

      if (!data.Body) {
        this.sendNotFound(res, "File not found");
        return;
      }

      const fileData: Buffer = data.Body as Buffer;
      res.send(fileData);
    });
  }

  /**
   * @inheritdoc
   */
  public async uploadSharedFile(req: Request, res: Response) {
    if (!this.hasRealmRole(req, ApplicationRoles.MANAGE_SHARED_FILES)) {
      this.sendForbidden(res, "You have no permission to manage shared files");
      return;
    }

    const pathPrefix = req.query.pathPrefix;
    const fileName = req.query.fileName;

    if (!fileName) {
      this.sendBadRequest(res, "Query parameter for fileName was not given");
      return;
    }

    if (!req.body) {
      this.sendBadRequest(res, "No file data in request");
    }

    if (!this.bucket) {
      this.sendInternalServerError(res, "S3 bucket name not found");
      return;
    }

    const fileData = req.file.buffer;
    const contentTypeObject = await fileType.fromBuffer(fileData);
    const contentType = contentTypeObject ? contentTypeObject.mime : undefined;
    const fullPath = pathPrefix ? `${pathPrefix}${fileName}` : fileName;
    const s3PutObjectParams: AWS.S3.PutObjectRequest = {
      Body: fileData,
      Bucket: this.bucket,
      Key: fullPath,
      ContentType: contentType
    };

    this.s3.putObject(s3PutObjectParams, (error) => {
      if (error) {
        this.sendInternalServerError(res, error);
        this.logger.info(`REQUEST ERROR IN S3 PUT OBJECT: ${error}`);
        return;
      }

      if (!this.bucket) {
        this.sendInternalServerError(res, "S3 bucket name not found");
        return;
      }

      const s3GetObjectParams = {
        Bucket: this.bucket,
        Key: fullPath
      };
      this.s3.getObject(s3GetObjectParams, (error, data) => {
        if (error) {
          this.sendInternalServerError(res, error);
          this.logger.info(`REQUEST ERROR IN S3 GET OBJECT: ${error}`);
          return;
        }

        const sharedFileCreated: SharedFile = {
          name: fileName,
          pathPrefix: pathPrefix,
          fileType: this.determineFileType(data.ContentType || "")
        }

        res.send(sharedFileCreated);
      });
    });
  }

  /**
   * @inheritdoc
   */
  public async uploadSharedFolder(req: Request, res: Response) {
    if (!this.hasRealmRole(req, ApplicationRoles.MANAGE_SHARED_FILES)) {
      this.sendForbidden(res, "You have no permission to manage shared files");
      return;
    }

    const pathPrefix = req.query.pathPrefix;
    const folderName = req.query.folderName;

    if (!folderName) {
      this.sendBadRequest(res, "Query parameter for folderName was not given");
      return;
    }

    if (!this.bucket) {
      this.sendInternalServerError(res, "S3 bucket name not found");
      return;
    }

    const fullPath = pathPrefix ? `${pathPrefix}${folderName}` : folderName;

    if (!folderName.endsWith("/")) {
      this.sendInternalServerError(res, "Invalid folder name. Folder name must end with forward slash '/'");
      return;
    }

    const s3PutObjectParams: AWS.S3.PutObjectRequest = {
      Bucket: this.bucket,
      Key: fullPath
    };

    this.s3.putObject(s3PutObjectParams, (error) => {
      if (error) {
        this.sendInternalServerError(res, error);
        this.logger.info(`REQUEST ERROR IN S3 PUT OBJECT: ${error}`);
        return;
      }

      if (!this.bucket) {
        this.sendInternalServerError(res, "S3 bucket name not found");
        return;
      }

      const s3GetObjectParams = {
        Bucket: this.bucket,
        Key: fullPath
      };

      this.s3.getObject(s3GetObjectParams, (error, data) => {
        if (error) {
          this.sendInternalServerError(res, error);
          this.logger.info(`REQUEST ERROR IN S3 GET OBJECT: ${error}`);
          return;
        }

        const sharedFileCreated: SharedFile = {
          name: folderName,
          pathPrefix: pathPrefix,
          fileType: FileType.FOLDER
        }

        res.send(sharedFileCreated);
      });
    });
  }

  /**
   * @inheritdoc
   */
  public async deleteSharedFile(req: Request, res: Response) {
    if (!this.hasRealmRole(req, ApplicationRoles.MANAGE_SHARED_FILES)) {
      this.sendForbidden(res, "You have no permission to manage shared files");
      return;
    }

    const pathPrefix = req.query.pathPrefix;
    const fileName = req.query.fileName;

    if (!fileName) {
      this.sendBadRequest(res, "Query parameter for fileName was not given");
      return;
    }

    if (!this.bucket) {
      this.sendInternalServerError(res, "S3 bucket name not found");
      return;
    }

    const fullPath = pathPrefix ? `${pathPrefix}${fileName}` : fileName;

    if (fileName.endsWith("/")) {
      const isValid = await this.isDeletionAllowed(res, fullPath);
      if (!isValid) {
        return;
      }
    }

    const s3Params: AWS.S3.DeleteObjectRequest = {
      Bucket: this.bucket,
      Key: fullPath
    }

    this.s3.deleteObject(s3Params, (error) => {
      if (error) {
        this.sendInternalServerError(res, error);
        return;
      }

      res.sendStatus(204);
    });
  }

  /**
   * Loads S3 object head information
   *
   * @param object S3 object
   * @returns SharedFile promise
   */
  private loadDataHead = (object: S3.Object): Promise<SharedFile> => {
    return new Promise((resolve, reject) => {
      const key = object.Key;
      if (!key) {
        return reject("Missing key");
      }

      if (!this.bucket) {
        return;
      }

      this.s3.headObject({ Bucket: this.bucket, Key: key }, (error, data) => {
        if (error) {
          return reject(error);
        }

        const isFolder = key.endsWith("/");
        const pathPrefix = this.parsePathFromKey(key);
        const name = this.parseFileNameFromKey(key);
        const fileType = this.determineFileType(data.ContentType || "");

        const fileObject: SharedFile = {
          name: name,
          pathPrefix: pathPrefix,
          fileType: isFolder ? FileType.FOLDER : fileType
        };

        resolve(fileObject);
      });
    })
  }

  /**
   * Checks if deletion of S3 object is allowed
   *
   * @param res response
   * @param fullPath full path of S3 object
   * @returns Promise of boolean
   */
  private isDeletionAllowed = (res: Response, fullPath: string): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      if (!this.bucket) {
        return reject("S3 bucket name not found");
      }

      const s3ListParams: AWS.S3.ListObjectsV2Request = {
        Bucket: this.bucket,
        Prefix: fullPath,
        Delimiter: "/"
      }
  
      this.s3.listObjectsV2(s3ListParams, (error, data) => {
        if (error) {
          this.sendInternalServerError(res, error);
          return reject(error);
        }
  
        if (data.Contents && data.Contents.filter(item => item.Key !== fullPath).length > 0) {
          this.sendForbidden(res, "Deleting non-empty folder is forbidden. Delete all its contents first");
          return resolve(false);
        }
  
        const folders = data.CommonPrefixes;
        if (folders && folders.length > 0) {
          const index = folders.findIndex(folder => this.parsePathFromKey(folder.Prefix || "") === fullPath);
          if (index !== -1) {
            this.sendForbidden(res, "Deleting non-empty folder is forbidden. Delete all its contents first");
            return resolve(false);
          }
        }

        resolve(true);
      });
    });
  }

  /**
   * Parses S3 object path from its key
   *
   * @param key S3 object key
   * @returns Path
   */
  private parsePathFromKey(key: string): string {
    if (!key.includes("/")) {
      return "";
    }

    const spliceIndex = key.endsWith("/") ? -2 : -1;
    const splitKey = key.split("/");
    splitKey.splice(spliceIndex);
    const joinedPath = splitKey.join("/");
    return joinedPath ? `${joinedPath}/` : "";
  }

  /**
   * Parses S3 object file name from its key
   *
   * @param key S3 object key
   * @returns File name
   */
  private parseFileNameFromKey(key: string): string {
    if (!key.includes("/")) {
      return key;
    }

    if (key.endsWith("/")) {
      const splitKey = key.split("/");
      splitKey.pop();
      return `${splitKey[splitKey.length - 1]}/`;
    } else {
      const splitKey = key.split("/");
      return splitKey[splitKey.length - 1];
    }
  }

  /**
   * Determines SharedFile type based on content-type property of S3 response object
   *
   * @param contentType content type
   * @returns FileType
   */
  private determineFileType(contentType: string): FileType {
    switch (contentType) {
      case "application/pdf":
        return FileType.PDF;
      case "image/png":
      case "image/jpeg":
        return FileType.IMAGE;
      default:
        return FileType.OTHER;
    }
  }
}