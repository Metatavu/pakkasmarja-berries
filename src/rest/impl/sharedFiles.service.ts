import { Application, Response, Request } from "express";
import * as Keycloak from "keycloak-connect";
import ApplicationRoles from "../application-roles";
import AWS = require("aws-sdk");
import { Logger, getLogger } from "log4js";
import SharedFilesService from "../api/sharedFiles.service";
import { SharedFile } from "../model/sharedFile";
import { FileType } from "../model/fileType";
import { S3 } from "aws-sdk";
import { config } from "../../config";
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
      credentials: {
        accessKeyId: process.env.AWS_IAM_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_IAM_SECRET_ACCESS_KEY || ""
      },
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
      Prefix: pathPrefix
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

      const fileHeadLoadPromises = data.Contents.map((content) => this.loadDataHead(content));
      const files: SharedFile[] = await Promise.all(fileHeadLoadPromises);
      res.send(files);
    });
  }

  /**
   * @inheritdoc
   */
  public async getSharedFile(req: Request, res: Response) {
    const pathPrefix = req.query.pathPrefix;
    const fileName = req.query.fileName;
    if (!pathPrefix) {
      this.sendBadRequest(res, "Query parameter for pathPrefix was not given");
      return;
    }

    if (!fileName) {
      this.sendBadRequest(res, "Query parameter for fileName was not given");
      return;
    }

    if (!this.bucket) {
      this.sendInternalServerError(res, "S3 bucket name not found");
      return;
    }

    const s3Params: AWS.S3.GetObjectRequest = {
      Bucket: this.bucket,
      Key: `${pathPrefix}${fileName}`
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

        const sharedFileCreated = {
          name: fileName,
          pathPrefix: pathPrefix,
          fileType: data.ContentType
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
    const s3Params: AWS.S3.GetObjectRequest = {
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
        const pathPrefix = this.parsePathFromKey(key, isFolder);
        const name = this.parseFileNameFromKey(key, isFolder);
        let fileType: FileType;
        switch (data.ContentType) {
          case "application/pdf":
            fileType = FileType.PDF;
          break;
          case "image/png":
          case "image/jpeg":
            fileType = FileType.IMAGE;
          break;
          default:
            fileType = FileType.OTHER;
          break;
        }

        const fileObject: SharedFile = {
          name: name,
          pathPrefix: pathPrefix,
          fileType: fileType
        };

        resolve(fileObject);
      });
    })
  }

  /**
   * Parses S3 object path from its key
   *
   * @param key S3 object key
   * @param folder Is object folder
   * @returns Path
   */
  private parsePathFromKey(key: string, folder: boolean): string {
    if (!key.includes("/")) {
      return "";
    }

    const splittedKey = key.split("/");
    splittedKey.filter(item => item).pop();
    return folder ? `${splittedKey.join("/")}/` : splittedKey.join("/");
  }

  /**
   * Parses S3 object file name from its key
   *
   * @param key S3 object key
   * @param folder Is object folder
   * @returns File name
   */
  private parseFileNameFromKey(key: string, folder: boolean): string {
    if (!key.includes("/")) {
      return key;
    }

    const splittedKey = key.split("/");
    const lastIndex = splittedKey.length - 1;
    return folder ?`${splittedKey[lastIndex]}`: splittedKey[lastIndex];
  }

}