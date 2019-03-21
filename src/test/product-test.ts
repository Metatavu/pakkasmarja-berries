import * as test from "blue-tape"; 
import * as request from "supertest";
import auth from "./auth";
import { Product } from "../rest/model/models";
import ApplicationRoles from "../rest/application-roles";
import database from "./database";

const testDataDir = `${__dirname}/../../src/test/data/`;
const productData = require(`${testDataDir}/product.json`);

/**
 * Creates product
 * 
 * @param token token
 * @returns promise for product
 */
const createProduct = (token: string): Promise<Product> => {
  const payload: Product = productData[0];

  return request("http://localhost:3002")
    .post("/rest/v1/products")
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .send(payload)
    .expect(200)
    .then((response) => {
      return response.body;
    });
}

/**
 * Updates product
 * 
 * @param token token
 * @param id id
 * @returns promise for product
 */
const updateProduct = (token: string, id: string): Promise<Product> => {
  const payload: Product = productData[1];

  return request("http://localhost:3002")
    .put(`/rest/v1/products/${id}`)
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .send(payload)
    .expect(200)
    .then((response) => {
      return response.body;
    });
}

/**
 * Finds product
 * 
 * @param token token
 * @param id id
 * @returns promise for product
 */
const findProduct = (token: string, id: string): Promise<Product> => {
  return request("http://localhost:3002")
    .get(`/rest/v1/products/${id}`)
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .expect(200)
    .then((response) => {
      return response.body;
    });
}

/**
 * Lists products
 * 
 * @param token token
 * @param userId userid
 * @returns promise for list of products
 */
const listProducts = (token: string, userId?: string): Promise<Product[]> => {
  let params = "";
  if (userId) {
    params = `?userId=${userId}`
  }

  return request("http://localhost:3002")
    .get(`/rest/v1/products${params}`)
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .expect(200)
    .then((response) => {
      return response.body;
    });
}

test("Create product", async (t) => {
  await database.executeFiles(testDataDir, ["product-test-setup.sql"]);
  const token = await auth.getTokenUser1([ApplicationRoles.CREATE_PRODUCTS, ApplicationRoles.DELETE_PRODUCTS]);

  try {
    const createdProduct = await createProduct(token);
    t.notEqual(createdProduct, null);
    t.notEqual(createdProduct.id, null);
    t.equal(createdProduct.itemGroupId, productData[0].itemGroupId);
    t.equal(createdProduct.name, productData[0].name);
    t.equal(createdProduct.unitName, productData[0].unitName);
    t.equal(createdProduct.unitSize, productData[0].unitSize);
  } finally {
    await database.executeFiles(testDataDir, ["product-test-teardown.sql"]);
  }

  await auth.removeUser1Roles([ApplicationRoles.CREATE_PRODUCTS]);
});

test("Update product", async (t) => {
  await database.executeFiles(testDataDir, ["product-test-setup.sql"]);
  const token = await auth.getTokenUser1([ApplicationRoles.UPDATE_OTHER_WEEK_DELIVERY_PREDICTION, ApplicationRoles.DELETE_PRODUCTS]);

  try {
    const createdProduct = await createProduct(token);
    const updatedProduct = await updateProduct(token, createdProduct.id || "");

    t.notEqual(updatedProduct, null);
    t.notEqual(updatedProduct.id, null);
    t.equal(updatedProduct.name, productData[1].name);
    t.equal(updatedProduct.itemGroupId, productData[1].itemGroupId);
    t.equal(updatedProduct.unitName, productData[1].unitName);
    t.equal(updatedProduct.unitSize, productData[1].unitSize);
  } finally {
    await database.executeFiles(testDataDir, ["product-test-teardown.sql"]);
  }

  await auth.removeUser1Roles([ApplicationRoles.UPDATE_OTHER_WEEK_DELIVERY_PREDICTION]);
});

test("Find product", async (t) => {
  await database.executeFiles(testDataDir, ["product-test-setup.sql"]);
  const token = await auth.getTokenUser1([ApplicationRoles.DELETE_PRODUCTS]);

  try {
    const createdProduct = await createProduct(token);
    const foundProduct = await findProduct(token, createdProduct.id || "");

    t.notEqual(foundProduct, null);
    t.notEqual(foundProduct.id, null);
    t.equal(foundProduct.name, productData[0].name);
    t.equal(foundProduct.itemGroupId, productData[0].itemGroupId);
    t.equal(foundProduct.unitName, productData[0].unitName);
    t.equal(foundProduct.unitSize, productData[0].unitSize);
  } finally {
    await database.executeFiles(testDataDir, ["product-test-teardown.sql"]);
  }

  await auth.removeUser1Roles([ApplicationRoles.DELETE_PRODUCTS]);
});

test("List products", async (t) => {
  await database.executeFiles(testDataDir, ["product-test-setup.sql"]);
  const token = await auth.getTokenUser1([ApplicationRoles.CREATE_PRODUCTS]);

  try {
    const listWithZeroItems = await listProducts(token);
    t.equal(0, listWithZeroItems.length);

    await createProduct(token);
    const listWithOneItem = await listProducts(token);
    t.equal(1, listWithOneItem.length);
  } finally {
    await database.executeFiles(testDataDir, ["product-test-teardown.sql"]);
  }

  await auth.removeUser1Roles([ApplicationRoles.LIST_ALL_WEEK_DELIVERY_PREDICTION]);
});

test("Delete product", async (t) => {
  await database.executeFiles(testDataDir, ["product-test-setup.sql"]);
  const token = await auth.getTokenUser1([ApplicationRoles.DELETE_PRODUCTS]);

  try {
    const createdProduct = await createProduct(token);
    await request("http://localhost:3002")
      .delete(`/rest/v1/products/${createdProduct.id}`)
      .set("Authorization", `Bearer ${token}`)
      .set("Accept", "application/json")
      .expect(204);
    
    const dbItems = await listProducts(token);
    t.equal(0, dbItems.length);
  } finally {
    await database.executeFiles(testDataDir, ["product-test-teardown.sql"]);
  }
});

test("Delete product - Forbidden", async (t) => {
  await database.executeFiles(testDataDir, ["product-test-setup.sql"]);
  const token = await auth.getTokenUser1();

  try {
    const createdProduct = await createProduct(token);
    await request("http://localhost:3002")
      .delete(`/rest/v1/products/${createdProduct.id}`)
      .set("Authorization", `Bearer ${token}`)
      .set("Accept", "application/json")
      .expect(204);
    
    const dbItems = await listProducts(token);
    t.equal(0, dbItems.length);
  } finally {
    await database.executeFiles(testDataDir, ["product-test-teardown.sql"]);
  }
});

test("Delete product created by other user", async (t) => {
  await database.executeFiles(testDataDir, ["product-test-setup.sql"]);
  const token1 = await auth.getTokenUser1([ApplicationRoles.DELETE_WEEK_DELIVERY_PREDICTIONS]);
  const token2 = await auth.getTokenUser2();

  try {
    const createdProduct = await createProduct(token2);
    await request("http://localhost:3002")
      .delete(`/rest/v1/products/${createdProduct.id}`)
      .set("Authorization", `Bearer ${token1}`)
      .set("Accept", "application/json")
      .expect(204);
    
    const dbItems = await listProducts(token2);
    t.equal(0, dbItems.length);
  } finally {
    await database.executeFiles(testDataDir, ["product-test-teardown.sql"]);
  }
});

test("Delete product - Forbidden", async (t) => {
  await database.executeFiles(testDataDir, ["product-test-setup.sql"]);
  const token1 = await auth.getTokenUser1();
  const token2 = await auth.getTokenUser2();
  await auth.removeUser2Roles([ApplicationRoles.DELETE_WEEK_DELIVERY_PREDICTIONS]);

  try {
    const createdProduct = await createProduct(token1);
    await request("http://localhost:3002")
      .delete(`/rest/v1/products/${createdProduct.id}`)
      .set("Authorization", `Bearer ${token2}`)
      .set("Accept", "application/json")
      .expect(403);
    
    const dbItems = await listProducts(token1);
    t.equal(1, dbItems.length);
  } finally {
    await database.executeFiles(testDataDir, ["product-test-teardown.sql"]);
  }
});