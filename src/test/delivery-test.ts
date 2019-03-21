import * as test from "blue-tape"; 
import * as request from "supertest";
import auth from "./auth";
import { Delivery } from "../rest/model/models";
import ApplicationRoles from "../rest/application-roles";
import database from "./database";

const testDataDir = `${__dirname}/../../src/test/data/`;
const deliveriesData = require(`${testDataDir}/deliveries.json`);

/**
 * Creates delivery
 * 
 * @param token token
 * @returns promise for delivery
 */
const createDelivery = (token: string, deliveryModel?: Delivery): Promise<Delivery> => {
  const payload: Delivery = deliveryModel || deliveriesData[0];

  return request("http://localhost:3002")
    .post("/rest/v1/deliveries")
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .send(payload)
    .expect(200)
    .then((response) => {
      return response.body;
    });
}

/**
 * Updates delivery
 * 
 * @param token token
 * @param id id
 * @returns promise for delivery
 */
const updateDelivery = (token: string, id: string): Promise<Delivery> => {
  const payload: Delivery = deliveriesData[1];
  return request("http://localhost:3002")
    .put(`/rest/v1/deliveries/${id}`)
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .send(payload)
    .expect(200)
    .then((response) => {
      return response.body;
    });
}

/**
 * Finds delivery
 * 
 * @param token token
 * @param id id
 * @returns promise for delivery
 */
const findDelivery = (token: string, id: string): Promise<Delivery> => {
  return request("http://localhost:3002")
    .get(`/rest/v1/deliveries/${id}`)
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .expect(200)
    .then((response) => {
      return response.body;
    });
}

/**
 * Build query
 * 
 * @param obj object of params
 */
const buildURLQuery = (obj: any) => {
  return Object.entries(obj)
    .map(pair => pair.map(encodeURIComponent).join('='))
    .join('&');
};

/**
 * Lists deliveries
 * 
 * @param token token
 * @returns promise for list of deliveries
 */
const listDeliveries = (token: string, params: any): Promise<Delivery[]> => {
  return request("http://localhost:3002")
    .get(`/rest/v1/deliveries?${buildURLQuery(params)}`)
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .expect(200)
    .then((response) => {
      return response.body;
    });
}

test("Create delivery", async (t) => {
  await database.executeFiles(testDataDir, ["delivery-setup.sql"]);
  const token = await auth.getTokenUser1([ApplicationRoles.CREATE_CHAT_GROUPS]);

  try {
    const createdDelivery = await createDelivery(token);
    t.notEqual(createdDelivery, null);
    t.notEqual(createdDelivery.id, null);
    t.equal(createdDelivery.status, deliveriesData[0].status)
    t.equal(createdDelivery.amount, deliveriesData[0].amount)
    t.equal(createdDelivery.deliveryPlaceId, deliveriesData[0].deliveryPlaceId)
    t.equal(createdDelivery.price, deliveriesData[0].price)
    t.equal(createdDelivery.productId, deliveriesData[0].productId)
    t.equal(createdDelivery.time, deliveriesData[0].time)
  } finally {
    await database.executeFiles(testDataDir, ["delivery-teardown.sql"]);
  }

  await auth.removeUser1Roles([ApplicationRoles.CREATE_CHAT_GROUPS]);
});

test("Update delivery", async (t) => {
  await database.executeFiles(testDataDir, ["delivery-setup.sql"]);
  const token = await auth.getTokenUser1([ApplicationRoles.CREATE_CHAT_GROUPS]);

  try {
    const createdDelivery = await createDelivery(token);
    const updatedDelivery = await updateDelivery(token, createdDelivery.id || "");
    t.notEqual(updatedDelivery, null);
    t.notEqual(updatedDelivery.id, null);
    t.equal(updatedDelivery.status, deliveriesData[1].status)
    t.equal(updatedDelivery.amount, deliveriesData[1].amount)
    t.equal(updatedDelivery.deliveryPlaceId, deliveriesData[1].deliveryPlaceId)
    t.equal(updatedDelivery.price, deliveriesData[1].price)
    t.equal(updatedDelivery.productId, deliveriesData[1].productId)
    t.equal(updatedDelivery.time, deliveriesData[1].time)
  } finally {
    await database.executeFiles(testDataDir, ["delivery-teardown.sql"]);
  }

  await auth.removeUser1Roles([ApplicationRoles.CREATE_CHAT_GROUPS]);
});

test("Find delivery", async (t) => {
  await database.executeFiles(testDataDir, ["delivery-setup.sql"]);
  const token = await auth.getTokenUser1([ApplicationRoles.CREATE_CHAT_GROUPS]);

  try {
    const createdDelivery = await createDelivery(token);
    const foundDelivery = await findDelivery(token, createdDelivery.id || "");
    t.notEqual(foundDelivery, null);
    t.notEqual(foundDelivery.id, null);
    t.equal(foundDelivery.status, deliveriesData[0].status)
    t.equal(foundDelivery.amount, deliveriesData[0].amount)
    t.equal(foundDelivery.deliveryPlaceId, deliveriesData[0].deliveryPlaceId)
    t.equal(foundDelivery.price, deliveriesData[0].price)
    t.equal(foundDelivery.productId, deliveriesData[0].productId)
    t.equal(foundDelivery.time, deliveriesData[0].time)
  } finally {
    await database.executeFiles(testDataDir, ["delivery-teardown.sql"]);
  }

  await auth.removeUser1Roles([ApplicationRoles.CREATE_CHAT_GROUPS]);
});

test("Delete delivery", async (t) => {
  await database.executeFiles(testDataDir, ["delivery-setup.sql"]);
  const token = await auth.getTokenUser1([ApplicationRoles.CREATE_CHAT_GROUPS]);

  try {
    const createdDelivery = await createDelivery(token);
    await request("http://localhost:3002")
      .delete(`/rest/v1/deliveries/${createdDelivery.id}`)
      .set("Authorization", `Bearer ${token}`)
      .set("Accept", "application/json")
      .expect(204)
      .then((response) => {});
    await request("http://localhost:3002")
      .get(`/rest/v1/deliveries/${createdDelivery.id}`)
      .set("Authorization", `Bearer ${token}`)
      .set("Accept", "application/json")
      .expect(404)
      .then((response) => {});
  } finally {
    await database.executeFiles(testDataDir, ["delivery-teardown.sql"]);
  }

  await auth.removeUser1Roles([ApplicationRoles.CREATE_CHAT_GROUPS]);
});

test("List deliveries", async (t) => {
  await database.executeFiles(testDataDir, ["delivery-setup.sql"]);
  const token = await auth.getTokenUser1([ApplicationRoles.CREATE_CHAT_GROUPS]);

  try {
    const params = {
      userId: "6f1cd486-107e-404c-a73f-50cc1fdabdd6"
    };

    let deliveries = await listDeliveries(token, params);
    t.equal(deliveries.length, 0);

    await createDelivery(token);
    deliveries = await listDeliveries(token, params);
    t.equal(deliveries.length, 1);

    await createDelivery(token);
    deliveries = await listDeliveries(token, params);
    t.equal(deliveries.length, 2);

    await createDelivery(token);
    deliveries = await listDeliveries(token, params);
    t.equal(deliveries.length, 3);
  } finally {
    await database.executeFiles(testDataDir, ["delivery-teardown.sql"]);
  }

  await auth.removeUser1Roles([ApplicationRoles.CREATE_CHAT_GROUPS]);
});

test("List deliveries - Forbidden", async (t) => {
  await database.executeFiles(testDataDir, ["delivery-setup.sql"]);
  const token = await auth.getTokenUser1([ApplicationRoles.CREATE_CHAT_GROUPS]);

  try {
    request("http://localhost:3002")
      .get(`/rest/v1/deliveries`)
      .set("Authorization", `Bearer ${token}`)
      .set("Accept", "application/json")
      .expect(403);
  } finally {
    await database.executeFiles(testDataDir, ["delivery-teardown.sql"]);
  }

  await auth.removeUser1Roles([ApplicationRoles.CREATE_CHAT_GROUPS]);
});

test("List deliveries with itemGroupCategory", async (t) => {
  await database.executeFiles(testDataDir, ["delivery-setup.sql"]);
  const token = await auth.getTokenUser1([ApplicationRoles.CREATE_CHAT_GROUPS]);

  try {
    await createDelivery(token, deliveriesData[0]);
    await createDelivery(token, deliveriesData[0]);
    await createDelivery(token, deliveriesData[1]);

    let params = {
      itemGroupCategory: "FRESH",
      userId: "6f1cd486-107e-404c-a73f-50cc1fdabdd6"
    };

    let deliveries = await listDeliveries(token, params);
    t.equal(deliveries.length, 1);

    params = {
      itemGroupCategory: "FROZEN",
      userId: "6f1cd486-107e-404c-a73f-50cc1fdabdd6"
    };

    deliveries = await listDeliveries(token, params);
    t.equal(deliveries.length, 2);
  } finally {
    await database.executeFiles(testDataDir, ["delivery-teardown.sql"]);
  }

  await auth.removeUser1Roles([ApplicationRoles.CREATE_CHAT_GROUPS]);
});