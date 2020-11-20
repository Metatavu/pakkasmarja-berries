import config from "./config";
import * as test from "blue-tape"; 
import * as request from "supertest";
import auth from "./auth";
import { WeekDeliveryPrediction } from "../rest/model/models";
import ApplicationRoles from "../rest/application-roles";
import database from "./database";

const testDataDir = `${__dirname}/../../src/test/data/`;
const weeklyDeliveryPredictionData = require(`${testDataDir}/week-delivery-predictions.json`);

/**
 * Creates week delivery prediction
 * 
 * @param token token
 * @returns promise for week delivery prediction
 */
const createWeekDeliveryPrediction = (token: string): Promise<WeekDeliveryPrediction> => {
  const payload: WeekDeliveryPrediction = weeklyDeliveryPredictionData[0];

  return request(config.get("baseUrl"))
    .post("/rest/v1/weekDeliveryPredictions")
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .send(payload)
    .expect(200)
    .then((response) => {
      return response.body;
    });
}

/**
 * Updates week delivery prediction
 * 
 * @param token token
 * @param id id
 * @returns promise for week delivery prediction
 */
const updateWeekDeliveryPrediction = (token: string, id: string): Promise<WeekDeliveryPrediction> => {
  const payload: WeekDeliveryPrediction = weeklyDeliveryPredictionData[1];
  return request(config.get("baseUrl"))
    .put(`/rest/v1/weekDeliveryPredictions/${id}`)
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .send(payload)
    .expect(200)
    .then((response) => {
      return response.body;
    });
}

/**
 * Finds week delivery prediction
 * 
 * @param token token
 * @param id id
 * @returns promise for week delivery prediction
 */
const findWeekDeliveryPrediction = (token: string, id: string): Promise<WeekDeliveryPrediction> => {
  return request(config.get("baseUrl"))
    .get(`/rest/v1/weekDeliveryPredictions/${id}`)
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .expect(200)
    .then((response) => {
      return response.body;
    });
}

/**
 * Lists week delivery predictions
 * 
 * @param token token
 * @param userId userid
 * @returns promise for list of week delivery predictions
 */
const listWeekDeliveryPredictions = (token: string, userId?: string): Promise<WeekDeliveryPrediction[]> => {
  let params = "";
  if (userId) {
    params = `?userId=${userId}`
  }

  return request(config.get("baseUrl"))
    .get(`/rest/v1/weekDeliveryPredictions${params}`)
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .expect(200)
    .then((response) => {
      return response.body;
    });
}

/**
 * Get days byte value
 * 
 * @param days days
 * @return byte value 
 */
const getDaysByteValue = (days: any) => {
  const MONDAY = 1 << 0;
  const TUESDAY = 1 << 1;
  const WEDNESDAY = 1 << 2;
  const THURSDAY = 1 << 3;
  const FRIDAY = 1 << 4;
  const SATURDAY = 1 << 5;
  const SUNDAY = 1 << 6;

  let byteNumber = 0;

  if (days['monday']) {
    byteNumber = byteNumber | MONDAY;
  }

  if (days['tuesday']) {
    byteNumber = byteNumber | TUESDAY;
  }

  if (days['wednesday']) {
    byteNumber = byteNumber | WEDNESDAY;
  }

  if (days['thursday']) {
    byteNumber = byteNumber | THURSDAY;
  }

  if (days['friday']) {
    byteNumber = byteNumber | FRIDAY;
  }

  if (days['saturday']) {
    byteNumber = byteNumber | SATURDAY;
  }

  if (days['sunday']) {
    byteNumber = byteNumber | SUNDAY;
  }

  return byteNumber;
}

test("Create week delivery prediction", async (t) => {
  await database.executeFiles(testDataDir, ["item-groups-for-week-delivery-prediction-setup.sql"]);
  const token = await auth.getTokenUser1([ApplicationRoles.CREATE_CHAT_GROUPS]);

  try {
    const createdWeekDeliveryPrediction = await createWeekDeliveryPrediction(token);
    t.notEqual(createdWeekDeliveryPrediction, null);
    t.notEqual(createdWeekDeliveryPrediction.id, null);
    t.equal(createdWeekDeliveryPrediction.weekNumber, weeklyDeliveryPredictionData[0].weekNumber);
    t.equal(createdWeekDeliveryPrediction.itemGroupId, weeklyDeliveryPredictionData[0].itemGroupId);
    t.equal(createdWeekDeliveryPrediction.amount, weeklyDeliveryPredictionData[0].amount);
    t.equal(createdWeekDeliveryPrediction.year, weeklyDeliveryPredictionData[0].year);
    t.equal(getDaysByteValue(createdWeekDeliveryPrediction.days), getDaysByteValue(weeklyDeliveryPredictionData[0].days));
  } finally {
    await database.executeFiles(testDataDir, ["item-groups-for-week-delivery-prediction-teardown.sql"]);
  }

  await auth.removeUser1Roles([ApplicationRoles.CREATE_CHAT_GROUPS]);
});

test("Update week delivery prediction", async (t) => {
  await database.executeFiles(testDataDir, ["item-groups-for-week-delivery-prediction-setup.sql"]);
  const token = await auth.getTokenUser1([ApplicationRoles.UPDATE_OTHER_WEEK_DELIVERY_PREDICTION]);

  try {
    const createdWeekDeliveryPrediction = await createWeekDeliveryPrediction(token);
    const updatedWeekDeliveryPrediction = await updateWeekDeliveryPrediction(token, createdWeekDeliveryPrediction.id || "");

    t.notEqual(updatedWeekDeliveryPrediction, null);
    t.notEqual(updatedWeekDeliveryPrediction.id, null);
    t.equal(updatedWeekDeliveryPrediction.weekNumber, weeklyDeliveryPredictionData[1].weekNumber);
    t.equal(updatedWeekDeliveryPrediction.itemGroupId, weeklyDeliveryPredictionData[1].itemGroupId);
    t.equal(updatedWeekDeliveryPrediction.amount, weeklyDeliveryPredictionData[1].amount);
    t.equal(updatedWeekDeliveryPrediction.year, weeklyDeliveryPredictionData[1].year);
    t.equal(getDaysByteValue(updatedWeekDeliveryPrediction.days), getDaysByteValue(weeklyDeliveryPredictionData[1].days));
  } finally {
    await database.executeFiles(testDataDir, ["item-groups-for-week-delivery-prediction-teardown.sql"]);
  }

  await auth.removeUser1Roles([ApplicationRoles.UPDATE_OTHER_WEEK_DELIVERY_PREDICTION]);
});

test("Find week delivery prediction", async (t) => {
  await database.executeFiles(testDataDir, ["item-groups-for-week-delivery-prediction-setup.sql"]);
  const token = await auth.getTokenUser1([ApplicationRoles.LIST_ALL_WEEK_DELIVERY_PREDICTION]);

  try {
    const createdWeekDeliveryPrediction = await createWeekDeliveryPrediction(token);
    const foundWeekDeliveryPrediction = await findWeekDeliveryPrediction(token, createdWeekDeliveryPrediction.id || "");

    t.notEqual(foundWeekDeliveryPrediction, null);
    t.notEqual(foundWeekDeliveryPrediction.id, null);
    t.equal(foundWeekDeliveryPrediction.weekNumber, weeklyDeliveryPredictionData[0].weekNumber);
    t.equal(foundWeekDeliveryPrediction.itemGroupId, weeklyDeliveryPredictionData[0].itemGroupId);
    t.equal(foundWeekDeliveryPrediction.amount, weeklyDeliveryPredictionData[0].amount);
    t.equal(foundWeekDeliveryPrediction.year, weeklyDeliveryPredictionData[0].year);
    t.equal(getDaysByteValue(foundWeekDeliveryPrediction.days), getDaysByteValue(weeklyDeliveryPredictionData[0].days));
  } finally {
    await database.executeFiles(testDataDir, ["item-groups-for-week-delivery-prediction-teardown.sql"]);
  }

  await auth.removeUser1Roles([ApplicationRoles.LIST_ALL_WEEK_DELIVERY_PREDICTION]);
});

test("Find week delivery prediction - Forbidden", async (t) => {
  await database.executeFiles(testDataDir, ["item-groups-for-week-delivery-prediction-setup.sql"]);
  const token1 = await auth.getTokenUser1();
  const token2 = await auth.getTokenUser2();
  await auth.removeUser2Roles([ApplicationRoles.LIST_ALL_WEEK_DELIVERY_PREDICTION]);

  try {
    const createdWeekDeliveryPrediction = await createWeekDeliveryPrediction(token1);
    await request(config.get("baseUrl"))
      .get(`/rest/v1/weekDeliveryPredictions/${createdWeekDeliveryPrediction.id}`)
      .set("Authorization", `Bearer ${token2}`)
      .set("Accept", "application/json")
      .expect(403);
  } finally {
    await database.executeFiles(testDataDir, ["item-groups-for-week-delivery-prediction-teardown.sql"]);
  }
});

test("List week delivery predictions", async (t) => {
  await database.executeFiles(testDataDir, ["item-groups-for-week-delivery-prediction-setup.sql"]);
  const token = await auth.getTokenUser1([ApplicationRoles.LIST_ALL_WEEK_DELIVERY_PREDICTION]);

  try {
    const listWithZeroItems = await listWeekDeliveryPredictions(token);
    t.equal(0, listWithZeroItems.length);

    await createWeekDeliveryPrediction(token);
    const listWithOneItem = await listWeekDeliveryPredictions(token);
    t.equal(1, listWithOneItem.length);
  } finally {
    await database.executeFiles(testDataDir, ["item-groups-for-week-delivery-prediction-teardown.sql"]);
  }

  await auth.removeUser1Roles([ApplicationRoles.LIST_ALL_WEEK_DELIVERY_PREDICTION]);
});

test("Delete week delivery prediction created by same user", async (t) => {
  await database.executeFiles(testDataDir, ["item-groups-for-week-delivery-prediction-setup.sql"]);
  const token = await auth.getTokenUser1();

  try {
    const createdWeekDeliveryPrediction = await createWeekDeliveryPrediction(token);
    await request(config.get("baseUrl"))
      .delete(`/rest/v1/weekDeliveryPredictions/${createdWeekDeliveryPrediction.id}`)
      .set("Authorization", `Bearer ${token}`)
      .set("Accept", "application/json")
      .expect(204);
    
    const dbItems = await listWeekDeliveryPredictions(token, createdWeekDeliveryPrediction.userId);
    t.equal(0, dbItems.length);
  } finally {
    await database.executeFiles(testDataDir, ["item-groups-for-week-delivery-prediction-teardown.sql"]);
  }
});

test("Delete week delivery prediction created by other user", async (t) => {
  await database.executeFiles(testDataDir, ["item-groups-for-week-delivery-prediction-setup.sql"]);
  const token1 = await auth.getTokenUser1([ApplicationRoles.DELETE_WEEK_DELIVERY_PREDICTIONS]);
  const token2 = await auth.getTokenUser2();

  try {
    const createdWeekDeliveryPrediction = await createWeekDeliveryPrediction(token2);
    await request(config.get("baseUrl"))
      .delete(`/rest/v1/weekDeliveryPredictions/${createdWeekDeliveryPrediction.id}`)
      .set("Authorization", `Bearer ${token1}`)
      .set("Accept", "application/json")
      .expect(204);
    
    const dbItems = await listWeekDeliveryPredictions(token2, createdWeekDeliveryPrediction.userId);
    t.equal(0, dbItems.length);
  } finally {
    await database.executeFiles(testDataDir, ["item-groups-for-week-delivery-prediction-teardown.sql"]);
  }
});

test("Delete week delivery prediction - Forbidden", async (t) => {
  await database.executeFiles(testDataDir, ["item-groups-for-week-delivery-prediction-setup.sql"]);
  const token1 = await auth.getTokenUser1();
  const token2 = await auth.getTokenUser2();
  await auth.removeUser2Roles([ApplicationRoles.DELETE_WEEK_DELIVERY_PREDICTIONS]);

  try {
    const createdWeekDeliveryPrediction = await createWeekDeliveryPrediction(token1);
    await request(config.get("baseUrl"))
      .delete(`/rest/v1/weekDeliveryPredictions/${createdWeekDeliveryPrediction.id}`)
      .set("Authorization", `Bearer ${token2}`)
      .set("Accept", "application/json")
      .expect(403);
    
    const dbItems = await listWeekDeliveryPredictions(token1, createdWeekDeliveryPrediction.userId);
    t.equal(1, dbItems.length);
  } finally {
    await database.executeFiles(testDataDir, ["item-groups-for-week-delivery-prediction-teardown.sql"]);
  }
});