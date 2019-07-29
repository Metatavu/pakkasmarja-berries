import * as test from "blue-tape"; 
import * as request from "supertest";
import auth from "./auth";
import { DeliveryQuality, ItemGroupCategory } from "../rest/model/models";
import ApplicationRoles from "../rest/application-roles";
import database from "./database";

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

  return request("http://localhost:3002")
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

  return request("http://localhost:3002")
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
  return request("http://localhost:3002")
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

  return request("http://localhost:3002")
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
    t.equal(createdDeliveryQuality.color, createdDeliveryQuality[0].color);
    t.equal(createdDeliveryQuality.name, createdDeliveryQuality[0].name);
    t.equal(createdDeliveryQuality.displayName, createdDeliveryQuality[0].displayName);
    t.equal(createdDeliveryQuality.priceBonus, createdDeliveryQuality[0].priceBonus);
    t.equal(createdDeliveryQuality.itemGroupCategory, createdDeliveryQuality[0].itemGroupCategory);
    t.equal(createdDeliveryQuality.deliveryQualityProductIds, createdDeliveryQuality[0].deliveryQualityProductIds);
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
    t.equal(createdDeliveryQuality.color, createdDeliveryQuality[1].color);
    t.equal(createdDeliveryQuality.name, createdDeliveryQuality[1].name);
    t.equal(createdDeliveryQuality.displayName, createdDeliveryQuality[1].displayName);
    t.equal(createdDeliveryQuality.priceBonus, createdDeliveryQuality[1].priceBonus);
    t.equal(createdDeliveryQuality.itemGroupCategory, createdDeliveryQuality[1].itemGroupCategory);
    t.equal(createdDeliveryQuality.deliveryQualityProductIds, createdDeliveryQuality[1].deliveryQualityProductIds);
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
    t.equal(foundDeliveryQuality.color, foundDeliveryQuality[0].color);
    t.equal(foundDeliveryQuality.name, foundDeliveryQuality[0].name);
    t.equal(foundDeliveryQuality.displayName, foundDeliveryQuality[0].displayName);
    t.equal(foundDeliveryQuality.priceBonus, foundDeliveryQuality[0].priceBonus);
    t.equal(foundDeliveryQuality.itemGroupCategory, foundDeliveryQuality[0].itemGroupCategory);
    t.equal(foundDeliveryQuality.deliveryQualityProductIds, foundDeliveryQuality[0].deliveryQualityProductIds);
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
  } finally {
    await database.executeFiles(testDataDir, ["delivery-qualities-teardown.sql"]);
  }

  await auth.removeUser1Roles([ApplicationRoles.MANAGE_DELIVERY_QUALITIES]);
});
