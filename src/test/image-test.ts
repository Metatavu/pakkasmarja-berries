import * as test from "blue-tape"; 
import * as request from "supertest";
import auth from "./auth";
import * as fs from "fs";

const testDataDir = `${__dirname}/../../src/test/data/`;

/**
 * Interface describing file upload response
 */
interface FileUploadResponse {
  url: string
}

/**
 * Creates image
 * 
 * @param token token
 * @returns promise for image
 */
const createImage = (token: string): Promise<FileUploadResponse> => {
  return request("http://localhost:3002")
    .post("/upload")
    .set("Content-Type", "application/x-www-form-urlencoded")
    .set("Authorization", `Bearer ${token}`)
    .attach('file', `${testDataDir}logo.png`)
    .expect(200)
    .then((response) => {
      console.log(response.body);
      return response.body;
    });
}

/**
 * Finds image
 * 
 * @param token token
 * @param url url
 * @returns promise for image
 */
const findImage = (token: string, url: string): Promise<any> => {
  console.log("url:  " + url);
  return request(url)
    .get("")
    .set("Authorization", `Bearer ${token}`)
    .expect(200)
    .then((response) => {
      return response.body;
    });
}

test("Create image", async (t) => {
  const token = await auth.getTokenUser1();
  const createdImage = await createImage(token);
  const imageData = await findImage(token, createdImage.url);
  const imageDataBuffer = Buffer.from(imageData);
  const fileDataBuffer = fs.readFileSync(`${testDataDir}logo.png`);
  t.ok(fileDataBuffer.equals(imageDataBuffer), "Uploaded file matches original file");
});