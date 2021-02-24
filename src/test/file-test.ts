import * as test from "blue-tape"; 
import * as request from "supertest";
import auth from "./auth";
import * as fs from "fs";
import { PublicFile } from "src/rest/model/models";
import TestConfig from "./test-config";

const testDataDir = `${__dirname}/../../src/test/data/`;

/**
 * Interface describing file upload response
 */
interface FileUploadResponse {
  url: string
}

/**
 * Creates file
 * 
 * @param token token
 * @returns promise for file
 */
const createFile = (token: string): Promise<FileUploadResponse> => {
  return request(TestConfig.HOST)
    .post("/upload")
    .set("Content-Type", "application/x-www-form-urlencoded")
    .set("Authorization", `Bearer ${token}`)
    .attach('file', `${testDataDir}logo.png`)
    .expect(200)
    .then((response) => {
      return response.body;
    });
}

/**
 * Finds file
 * 
 * @param token token
 * @param url url
 * @returns promise for file
 */
const findFile = (token: string, url: string): Promise<any> => {
  return request(url)
    .get("")
    .set("Authorization", `Bearer ${token}`)
    .expect(200)
    .then((response) => {
      return response.body;
    });
}

/**
 * Creates publicFile
 * 
 * @param token token
 * @param url url to file
 * @returns promise for publicFile
 */
const createPublicFile = (token: string, url: string): Promise<PublicFile> => {
  const payload: PublicFile = {
    id: null,
    url: url
  };

  return request(TestConfig.HOST)
    .post("/rest/v1/publicFiles")
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .send(payload)
    .expect(200)
    .then((response) => {
      return response.body;
    });
}

/**
 * Updates publicFile
 * 
 * @param token token
 * @param id id
 * @param url url
 * @returns promise for publicFile
 */
const updatePublicFile = (token: string, id: string, url: string): Promise<PublicFile> => {
  const payload: PublicFile = {
    id: id,
    url: url
  };

  return request(TestConfig.HOST)
    .put(`/rest/v1/publicFiles/${id}`)
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .send(payload)
    .expect(200)
    .then((response) => {
      return response.body;
    });
}

/**
 * Finds publicFile
 * 
 * @param token token
 * @param id id
 * @returns promise for publicFile
 */
const findPublicFile = (token: string, id: string): Promise<PublicFile> => {
  return request(TestConfig.HOST)
    .get(`/rest/v1/publicFiles/${id}`)
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .expect(200)
    .then((response) => {
      return response.body;
    });
}

/**
 * Lists publicFiles
 * 
 * @param token token
 * @returns promise for list of publicFiles
 */
const listPublicFiles = (token: string): Promise<PublicFile[]> => {

  return request(TestConfig.HOST)
    .get(`/rest/v1/publicFiles`)
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .expect(200)
    .then((response) => {
      return response.body;
    });
}

/**
 * Deletes public file
 * 
 * @param token access token
 * @param id id
 */
const deletePublicFile = (token: string, id: string) => {
  return request(TestConfig.HOST)
    .delete(`/rest/v1/publicFiles/${id}`)
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .expect(204);
}

test("Create file", async (t) => {
  const token = await auth.getTokenUser1();
  const createdImage = await createFile(token);
  const imageData = await findFile(token, createdImage.url);
  const imageDataBuffer = Buffer.from(imageData);
  const fileDataBuffer = fs.readFileSync(`${testDataDir}logo.png`);
  t.ok(fileDataBuffer.equals(imageDataBuffer), "Uploaded file matches original file");
});

test("Test public files", async (t) => {
  const token = await auth.getTokenUser1();
  const createdImage = await createFile(token);
  const createdPublicFile = await createPublicFile(token, createdImage.url);

  t.ok(createdImage.url);
  t.equal(createdImage.url, createdPublicFile.url);

  const createdImage2 = await createFile(token);
  const createdPublicFile2 = await createPublicFile(token, createdImage2.url);

  const publicFiles = await listPublicFiles(token);
  t.equal(2, publicFiles.length);

  const foundPublicFile = await findPublicFile(token, createdPublicFile.id!);
  t.equal(createdPublicFile.id, foundPublicFile.id);
  t.equal(createdPublicFile.url, foundPublicFile.url);

  const createdImage3 = await createFile(token);
  await updatePublicFile(token, createdPublicFile.id!, createdImage3.url);
  const findUpdatedPublicFile = await findPublicFile(token, createdPublicFile.id!);
  t.equal(findUpdatedPublicFile.url, createdImage3.url);

  const token2 = await auth.getTokenUser1();
  await deletePublicFile(token2, createdPublicFile.id!);
  await deletePublicFile(token2, createdPublicFile2.id!);

  const noPublicFilesList = await listPublicFiles(token);
  t.equal(0, noPublicFilesList.length);
});