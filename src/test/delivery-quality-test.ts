import * as test from "blue-tape"; 
import * as request from "supertest";
import auth from "./auth";
import { DeliveryQuality, ItemGroupCategory } from "../rest/model/models";
import ApplicationRoles from "../rest/application-roles";
import database from "./database";
import TestConfig from "./test-config";

const testDataDir = `${__dirname}/../../src/test/data/`;
const deliveryQualityData = require(`${testDataDir}/delivery-quality.json`);

/**
 * Creates delivery quality
 * 
 * @param token token
 * @returns promise for DeliveryQuality
 */
const createDeliveryQuality = (token: string): Promise<DeliveryQuality> => {
  const payload: DeliveryQuality = deliveryQualityData[0];

  return request(TestConfig.HOST)
    .post("/rest/v1/deliveryQualities")
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .send(payload)
    .expect(200)
    .then((response) => {
      return response.body;
    });
}

/**
 * Updates delivery quality
 * 
 * @param token token
 * @param id id
 * @returns promise for DeliveryQuality
 */
const updateDeliveryQuality = (token: string, id: string): Promise<DeliveryQuality> => {
  const payload: DeliveryQuality = deliveryQualityData[1];

  return request(TestConfig.HOST)
    .put(`/rest/v1/deliveryQualities/${id}`)
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .send(payload)
    .expect(200)
    .then((response) => {
      return response.body;
    });
}

/**
 * Finds delivery quality
 * 
 * @param token token
 * @param id id
 * @returns promise for delivery quality
 */
const findDeliveryQuality = (token: string, id: string): Promise<DeliveryQuality> => {
  return request(TestConfig.HOST)
    .get(`/rest/v1/deliveryQualities/${id}`)
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .expect(200)
    .then((response) => {
      return response.body;
    });
}

/**
 * Lists delivery qualities
 * 
 * @param token token
 * @param userId userid
 * @returns promise for list of delivery qualities
 */
const listDeliveryQualities = (token: string, category?: ItemGroupCategory, productId?: string): Promise<DeliveryQuality[]> => {
  let params = "";
  if (category) {
    params = `?category=${category}`
  }

  if (productId) {
    params = `?productId=${productId}`
  }

  return request(TestConfig.HOST)
    .get(`/rest/v1/deliveryQualities${params}`)
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .expect(200)
    .then((response) => {
      return response.body;
    });
}

test("Create delivery quality", async (t) => {
  await database.executeFiles(testDataDir, ["delivery-qualities-setup.sql"]);
  const token = await auth.getTokenUser1([ApplicationRoles.MANAGE_DELIVERY_QUALITIES]);

  try {
    const createdDeliveryQuality = await createDeliveryQuality(token);
    t.notEqual(createdDeliveryQuality, null);
    t.notEqual(createdDeliveryQuality.id, null);
    t.equal(createdDeliveryQuality.color, deliveryQualityData[0].color);
    t.equal(createdDeliveryQuality.name, deliveryQualityData[0].name);
    t.equal(createdDeliveryQuality.displayName, deliveryQualityData[0].displayName);
    t.equal(createdDeliveryQuality.priceBonus, deliveryQualityData[0].priceBonus);
    t.equal(createdDeliveryQuality.itemGroupCategory, deliveryQualityData[0].itemGroupCategory);
    t.deepEquals(createdDeliveryQuality.deliveryQualityProductIds, deliveryQualityData[0].deliveryQualityProductIds);
  } finally {
    await database.executeFiles(testDataDir, ["delivery-qualities-teardown.sql"]);
  }

  await auth.removeUser1Roles([ApplicationRoles.MANAGE_DELIVERY_QUALITIES]);
});

test("Update delivery quality", async (t) => {
  await database.executeFiles(testDataDir, ["delivery-qualities-setup.sql"]);
  const token = await auth.getTokenUser1([ApplicationRoles.MANAGE_DELIVERY_QUALITIES]);

  try {
    const createdDeliveryQuality = await createDeliveryQuality(token);
    const updatedDeliveryQuality = await updateDeliveryQuality(token, createdDeliveryQuality.id || "");

    t.notEqual(updatedDeliveryQuality, null);
    t.notEqual(updatedDeliveryQuality.id, null);
    t.equal(updatedDeliveryQuality.color, deliveryQualityData[1].color);
    t.equal(updatedDeliveryQuality.name, deliveryQualityData[1].name);
    t.equal(updatedDeliveryQuality.displayName, deliveryQualityData[1].displayName);
    t.equal(updatedDeliveryQuality.priceBonus, deliveryQualityData[1].priceBonus);
    t.equal(updatedDeliveryQuality.itemGroupCategory, deliveryQualityData[1].itemGroupCategory);
    t.deepEquals(updatedDeliveryQuality.deliveryQualityProductIds, deliveryQualityData[1].deliveryQualityProductIds);
  } finally {
    await database.executeFiles(testDataDir, ["delivery-qualities-teardown.sql"]);
  }

  await auth.removeUser1Roles([ApplicationRoles.MANAGE_DELIVERY_QUALITIES]);
});

test("Find delivery quality", async (t) => {
  await database.executeFiles(testDataDir, ["delivery-qualities-setup.sql"]);
  const token = await auth.getTokenUser1([ApplicationRoles.MANAGE_DELIVERY_QUALITIES]);

  try {
    const createdDeliveryQuality = await createDeliveryQuality(token);
    const foundDeliveryQuality = await findDeliveryQuality(token, createdDeliveryQuality.id || "");

    t.notEqual(foundDeliveryQuality, null);
    t.notEqual(foundDeliveryQuality.id, null);
    t.equal(foundDeliveryQuality.color, deliveryQualityData[0].color);
    t.equal(foundDeliveryQuality.name, deliveryQualityData[0].name);
    t.equal(foundDeliveryQuality.displayName, deliveryQualityData[0].displayName);
    t.equal(foundDeliveryQuality.priceBonus, deliveryQualityData[0].priceBonus);
    t.equal(foundDeliveryQuality.itemGroupCategory, deliveryQualityData[0].itemGroupCategory);
    t.deepEquals(foundDeliveryQuality.deliveryQualityProductIds, deliveryQualityData[0].deliveryQualityProductIds);
  } finally {
    await database.executeFiles(testDataDir, ["delivery-qualities-teardown.sql"]);
  }

  await auth.removeUser1Roles([ApplicationRoles.MANAGE_DELIVERY_QUALITIES]);
});

test("List delivery qualities", async (t) => {
  await database.executeFiles(testDataDir, ["delivery-qualities-setup.sql"]);
  const token = await auth.getTokenUser1([ApplicationRoles.MANAGE_DELIVERY_QUALITIES]);

  try {
    const listWithZeroItems = await listDeliveryQualities(token);
    t.equal(0, listWithZeroItems.length);

    await createDeliveryQuality(token);
    const listWithOneItem = await listDeliveryQualities(token);
    t.equal(1, listWithOneItem.length);

    const listWithFreshParam = await listDeliveryQualities(token, "FRESH");
    t.equal(1, listWithFreshParam.length);

    const listWithProductIdParam = await listDeliveryQualities(token, undefined, deliveryQualityData[0].deliveryQualityProductIds[0]);
    t.equal(1, listWithProductIdParam.length);

  } finally {
    await database.executeFiles(testDataDir, ["delivery-qualities-teardown.sql"]);
  }

  await auth.removeUser1Roles([ApplicationRoles.MANAGE_DELIVERY_QUALITIES]);
});
