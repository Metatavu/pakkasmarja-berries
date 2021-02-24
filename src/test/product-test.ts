import * as test from "blue-tape"; 
import * as request from "supertest";
import auth from "./auth";
import { Product, ProductPrice } from "../rest/model/models";
import ApplicationRoles from "../rest/application-roles";
import database from "./database";
import TestConfig from "./test-config";

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

  return request(TestConfig.HOST)
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
 * Creates product price
 * 
 * @param token token
 * @param product product
 * @returns promise for product
 */
const createProductPrice = async (token: string, product: Product) => {
  const payload: ProductPrice = {
    id: null,
    productId: product.id || "",
    unit: "€ / kg",
    price: "100",
    createdAt: new Date(),
    updatedAt: new Date()
  };

  return request(TestConfig.HOST)
    .post(`/rest/v1/products/${product.id}/prices`)
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

  return request(TestConfig.HOST)
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
  return request(TestConfig.HOST)
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

  return request(TestConfig.HOST)
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
    t.equal(createdProduct.active, productData[0].active);
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
    t.equal(updatedProduct.active, productData[1].active);
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
    await request(TestConfig.HOST)
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
    await request(TestConfig.HOST)
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
    await request(TestConfig.HOST)
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
    await request(TestConfig.HOST)
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

test("Create product price", async (t) => {
  await database.executeFiles(testDataDir, ["product-test-setup.sql"]);
  const token = await auth.getTokenUser1([ApplicationRoles.CREATE_PRODUCTS, ApplicationRoles.MANAGE_PRODUCT_PRICES]);

  try {
    const createdProduct = await createProduct(token);
    t.notEqual(createdProduct, null);
    t.notEqual(createdProduct.id, null);

    const createdProductPrice = await createProductPrice(token, createdProduct);
    t.notEqual(createdProductPrice, null);
    t.notEqual(createdProductPrice.id, null);
    t.equal(createdProductPrice.unit, "€ / kg");
    t.equal(createdProductPrice.price, "100");
    t.equal(createdProductPrice.productId, createdProduct.id);
  } finally {
    await database.executeFiles(testDataDir, ["product-test-teardown.sql"]);
  }

  await auth.removeUser1Roles([ApplicationRoles.CREATE_PRODUCTS]);
});

test("Delete product price", async (t) => {
  await database.executeFiles(testDataDir, ["product-test-setup.sql"]);
  const token = await auth.getTokenUser1([ApplicationRoles.CREATE_PRODUCTS, ApplicationRoles.MANAGE_PRODUCT_PRICES]);

  try {
    const createdProduct = await createProduct(token);
    t.notEqual(createdProduct, null);
    t.notEqual(createdProduct.id, null);

    const createdProductPrice = await createProductPrice(token, createdProduct);
    t.notEqual(createdProductPrice, null);
    t.notEqual(createdProductPrice.id, null);

    await request(TestConfig.HOST)
      .delete(`/rest/v1/products/${createdProduct.id}/prices/${createdProductPrice.id}`)
      .set("Authorization", `Bearer ${token}`)
      .set("Accept", "application/json")
      .expect(204);
  } finally {
    await database.executeFiles(testDataDir, ["product-test-teardown.sql"]);
  }

  await auth.removeUser1Roles([ApplicationRoles.CREATE_PRODUCTS]);
});

test("Find product price", async (t) => {
  await database.executeFiles(testDataDir, ["product-test-setup.sql"]);
  const token = await auth.getTokenUser1([ApplicationRoles.CREATE_PRODUCTS, ApplicationRoles.MANAGE_PRODUCT_PRICES]);

  try {
    const createdProduct = await createProduct(token);
    t.notEqual(createdProduct, null);
    t.notEqual(createdProduct.id, null);

    const createdProductPrice = await createProductPrice(token, createdProduct);
    t.notEqual(createdProductPrice, null);
    t.notEqual(createdProductPrice.id, null);

    const foundPrice = await request(TestConfig.HOST)
      .get(`/rest/v1/products/${createdProduct.id}/prices/${createdProductPrice.id}`)
      .set("Authorization", `Bearer ${token}`)
      .set("Accept", "application/json")
      .expect(200)
      .then((response) => {
        return response.body;
      });
    
    t.notEqual(foundPrice, null);
    t.notEqual(foundPrice.id, null);
    t.equal(foundPrice.unit, "€ / kg");
    t.equal(foundPrice.price, "100");
    t.equal(foundPrice.productId, createdProduct.id);
  } finally {
    await database.executeFiles(testDataDir, ["product-test-teardown.sql"]);
  }

  await auth.removeUser1Roles([ApplicationRoles.CREATE_PRODUCTS]);
});

test("List product prices", async (t) => {
  await database.executeFiles(testDataDir, ["product-test-setup.sql"]);
  const token = await auth.getTokenUser1([ApplicationRoles.CREATE_PRODUCTS, ApplicationRoles.MANAGE_PRODUCT_PRICES]);

  try {
    const createdProduct = await createProduct(token);
    t.notEqual(createdProduct, null);
    t.notEqual(createdProduct.id, null);

    const createdProductPrice = await createProductPrice(token, createdProduct);
    t.notEqual(createdProductPrice, null);
    t.notEqual(createdProductPrice.id, null);

    let prices = await request(TestConfig.HOST)
      .get(`/rest/v1/products/${createdProduct.id}/prices?sort=CREATED_AT_ASC`)
      .set("Authorization", `Bearer ${token}`)
      .set("Accept", "application/json")
      .expect(200)
      .then((response) => {
        return response.body;
      });
    
    t.notEqual(prices, null);
    t.equals(prices.length, 1);

    await createProductPrice(token, createdProduct);

    prices = await request(TestConfig.HOST)
      .get(`/rest/v1/products/${createdProduct.id}/prices?sort=CREATED_AT_ASC`)
      .set("Authorization", `Bearer ${token}`)
      .set("Accept", "application/json")
      .expect(200)
      .then((response) => {
        return response.body;
      });
    
    t.notEqual(prices, null);
    t.equals(prices.length, 2);
  } finally {
    await database.executeFiles(testDataDir, ["product-test-teardown.sql"]);
  }

  await auth.removeUser1Roles([ApplicationRoles.CREATE_PRODUCTS]);
});

test("List product prices - 400 - no product id", async (t) => {
  await database.executeFiles(testDataDir, ["product-test-setup.sql"]);
  const token = await auth.getTokenUser1([ApplicationRoles.CREATE_PRODUCTS, ApplicationRoles.MANAGE_PRODUCT_PRICES]);

  try {
    await request(TestConfig.HOST)
      .get(`/rest/v1/products/${undefined}/prices`)
      .set("Authorization", `Bearer ${token}`)
      .set("Accept", "application/json")
      .expect(400)
  } finally {
    await database.executeFiles(testDataDir, ["product-test-teardown.sql"]);
  }

  await auth.removeUser1Roles([ApplicationRoles.CREATE_PRODUCTS]);
});

test("Update product price", async (t) => {
  await database.executeFiles(testDataDir, ["product-test-setup.sql"]);
  const token = await auth.getTokenUser1([ApplicationRoles.CREATE_PRODUCTS, ApplicationRoles.MANAGE_PRODUCT_PRICES]);

  try {
    const createdProduct = await createProduct(token);
    t.notEqual(createdProduct, null);
    t.notEqual(createdProduct.id, null);

    let createdProductPrice = await createProductPrice(token, createdProduct);
    createdProductPrice.price = "200";
    createdProductPrice.unit = "$ / lb";
    t.notEqual(createdProductPrice, null);
    t.notEqual(createdProductPrice.id, null);

    const updatedProductPrice = await request(TestConfig.HOST)
      .put(`/rest/v1/products/${createdProduct.id}/prices/${createdProductPrice.id}`)
      .set("Authorization", `Bearer ${token}`)
      .set("Accept", "application/json")
      .send(createdProductPrice)
      .expect(200)
      .then((response) => {
        return response.body;
      });
    
    t.equal(updatedProductPrice.unit, "$ / lb");
    t.equal(updatedProductPrice.price, "200");
  } finally {
    await database.executeFiles(testDataDir, ["product-test-teardown.sql"]);
  }

  await auth.removeUser1Roles([ApplicationRoles.CREATE_PRODUCTS]);
});

test("Update product price - 404 - wrong product id", async (t) => {
  await database.executeFiles(testDataDir, ["product-test-setup.sql"]);
  const token = await auth.getTokenUser1([ApplicationRoles.CREATE_PRODUCTS, ApplicationRoles.MANAGE_PRODUCT_PRICES]);

  try {
    const createdProduct = await createProduct(token);
    t.notEqual(createdProduct, null);
    t.notEqual(createdProduct.id, null);

    const createdProductPrice = await createProductPrice(token, createdProduct);
    t.notEqual(createdProductPrice, null);
    t.notEqual(createdProductPrice.id, null);

    await request(TestConfig.HOST)
      .put(`/rest/v1/products/fake-uuid/prices/${createdProductPrice.id}`)
      .set("Authorization", `Bearer ${token}`)
      .set("Accept", "application/json")
      .send(createdProductPrice)
      .expect(404);
  } finally {
    await database.executeFiles(testDataDir, ["product-test-teardown.sql"]);
  }

  await auth.removeUser1Roles([ApplicationRoles.CREATE_PRODUCTS]);
});

test("Update product price - 404 - wrong product price id", async (t) => {
  await database.executeFiles(testDataDir, ["product-test-setup.sql"]);
  const token = await auth.getTokenUser1([ApplicationRoles.CREATE_PRODUCTS, ApplicationRoles.MANAGE_PRODUCT_PRICES]);

  try {
    const createdProduct = await createProduct(token);
    t.notEqual(createdProduct, null);
    t.notEqual(createdProduct.id, null);

    const createdProductPrice = await createProductPrice(token, createdProduct);
    t.notEqual(createdProductPrice, null);
    t.notEqual(createdProductPrice.id, null);

    await request(TestConfig.HOST)
      .put(`/rest/v1/products/${createdProduct.id}/prices/fake-uuid`)
      .set("Authorization", `Bearer ${token}`)
      .set("Accept", "application/json")
      .send(createdProductPrice)
      .expect(404);
  } finally {
    await database.executeFiles(testDataDir, ["product-test-teardown.sql"]);
  }

  await auth.removeUser1Roles([ApplicationRoles.CREATE_PRODUCTS]);
});

test("Update product price - 400 - no price", async (t) => {
  await database.executeFiles(testDataDir, ["product-test-setup.sql"]);
  const token = await auth.getTokenUser1([ApplicationRoles.CREATE_PRODUCTS, ApplicationRoles.MANAGE_PRODUCT_PRICES]);

  try {
    const createdProduct = await createProduct(token);
    t.notEqual(createdProduct, null);
    t.notEqual(createdProduct.id, null);

    const createdProductPrice = await createProductPrice(token, createdProduct);
    t.notEqual(createdProductPrice, null);
    t.notEqual(createdProductPrice.id, null);

    const updatedProductPrice = {
      id: createdProductPrice.id,
      unit: "€",
      productId: createdProduct.id
    };

    await request(TestConfig.HOST)
      .put(`/rest/v1/products/${createdProduct.id}/prices/${createdProductPrice.id}`)
      .set("Authorization", `Bearer ${token}`)
      .set("Accept", "application/json")
      .send(updatedProductPrice)
      .expect(400);
  } finally {
    await database.executeFiles(testDataDir, ["product-test-teardown.sql"]);
  }

  await auth.removeUser1Roles([ApplicationRoles.CREATE_PRODUCTS]);
});

test("Update product price - 400 - no unit", async (t) => {
  await database.executeFiles(testDataDir, ["product-test-setup.sql"]);
  const token = await auth.getTokenUser1([ApplicationRoles.CREATE_PRODUCTS, ApplicationRoles.MANAGE_PRODUCT_PRICES]);

  try {
    const createdProduct = await createProduct(token);
    t.notEqual(createdProduct, null);
    t.notEqual(createdProduct.id, null);

    const createdProductPrice = await createProductPrice(token, createdProduct);
    t.notEqual(createdProductPrice, null);
    t.notEqual(createdProductPrice.id, null);

    const updatedProductPrice = {
      id: createdProductPrice.id,
      productId: createdProduct.id,
      price: "200"
    };

    await request(TestConfig.HOST)
      .put(`/rest/v1/products/${createdProduct.id}/prices/${createdProductPrice.id}`)
      .set("Authorization", `Bearer ${token}`)
      .set("Accept", "application/json")
      .send(updatedProductPrice)
      .expect(400);
  } finally {
    await database.executeFiles(testDataDir, ["product-test-teardown.sql"]);
  }

  await auth.removeUser1Roles([ApplicationRoles.CREATE_PRODUCTS]);
});