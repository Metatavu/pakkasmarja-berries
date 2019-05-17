import * as test from "blue-tape"; 
import * as request from "supertest";
import auth from "./auth";
import ApplicationRoles from "../rest/application-roles";
import { DataSheet } from "../rest/model/models";

/**
 * Creates data sheet
 * 
 * @param token token
 * @param name name
 * @param data data
 * @returns promise for data sheet
 */
const createDataSheet = (token: string, name: string, data: string[][]): Promise<DataSheet> => {
  const payload: DataSheet = {
    id: null,
    name: name,
    data: data
  };

  return request("http://localhost:3002")
    .post("/rest/v1/dataSheets")
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .send(payload)
    .expect(200)
    .then((response) => {
      return response.body;
    });
}

/**
 * Creates data sheet
 * 
 * @param token token
 * @param id id
 * @param name name
 * @param data data
 * @returns promise for data sheet
 */
const updateDataSheet = (token: string, id: string, name: string, data: string[][]): Promise<DataSheet> => {
  const payload: DataSheet = {
    id: id,
    name: name,
    data: data
  };

  return request("http://localhost:3002")
    .put(`/rest/v1/dataSheets/${id}`)
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .send(payload)
    .expect(200)
    .then((response) => {
      return response.body;
    });
}

/**
 * Finds data sheet
 * 
 * @param token token
 * @param id data sheet id
 * @param expectStatus 
 * @returns promise for data sheet
 */
const findDataSheet = (token: string, id: string, expectStatus?: number): Promise<DataSheet> => {
  return request("http://localhost:3002")
    .get(`/rest/v1/dataSheets/${id}`)
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .expect(expectStatus || 200)
    .then((response) => {
      return response.body;
    });  
}

/**
 * Lists data sheets
 * 
 * @param token token
 * @returns promise for data sheets
 */
const listDataSheets = (token: string): Promise<DataSheet[]> => {
  return request("http://localhost:3002")
    .get(`/rest/v1/dataSheets`)
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .expect(200)
    .then((response) => {
      return response.body;
    });  
}

/**
 * Deletes data sheet
 * 
 * @param token token
 * @param id data sheet id
 * @returns promise for delete
 */
const deleteDataSheet = async (token: string, id: string) => {
  return request("http://localhost:3002")
    .delete(`/rest/v1/dataSheets/${id}`)
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .expect(204);
}

test("Create data sheet", async (t) => {
  const token = await auth.getTokenUser1([ApplicationRoles.MANAGE_DATA_SHEETS]);

  const name = "sheet-name";
  const data: string[][] = [
    ["1"], ["2"]
    ["2"], ["4"]
  ];
  
  const createdDataSheet = await createDataSheet(token, name, data);
  t.notEqual(createdDataSheet, null);
  t.notEqual(createdDataSheet.id, null);
  t.equal(createdDataSheet.name, "sheet-name");
  t.deepEquals(createdDataSheet.data,  data);
  await deleteDataSheet(token, createdDataSheet.id!);
  
  await auth.removeUser1Roles([ApplicationRoles.MANAGE_DATA_SHEETS]);
});

test("Update data sheet", async (t) => {
  const token = await auth.getTokenUser1([ApplicationRoles.MANAGE_DATA_SHEETS]);

  const name = "sheet-name";
  const data: string[][] = [
    ["1"], ["2"]
    ["2"], ["4"]
  ];
  
  const createdDataSheet = await createDataSheet(token, name, data);
  t.notEqual(createdDataSheet, null);
  t.notEqual(createdDataSheet.id, null);
  t.equal(createdDataSheet.name, "sheet-name");
  t.deepEquals(createdDataSheet.data,  data);

  const updateName = "update-name";
  const updateData: string[][] = [
    ["6"], ["7"]
    ["2"], ["4"]
  ];

  const updatedDataSheet = await updateDataSheet(token, createdDataSheet.id!, updateName, updateData);

  t.notEqual(updatedDataSheet, null);
  t.notEqual(updatedDataSheet.id, null);
  t.equal(updatedDataSheet.name, updateName);
  t.deepEquals(updatedDataSheet.data, updateData);

  const foundDataSheet = await findDataSheet(token, createdDataSheet.id!);
  
  t.deepEqual(foundDataSheet, updatedDataSheet);

  await deleteDataSheet(token, createdDataSheet.id!);
  
  await auth.removeUser1Roles([ApplicationRoles.MANAGE_DATA_SHEETS]);
});

test("Finds data sheet", async (t) => {
  const token = await auth.getTokenUser1([ApplicationRoles.MANAGE_DATA_SHEETS]);

  const name = "sheet-name";
  const data: string[][] = [
    ["1"], ["2"]
    ["2"], ["4"]
  ];

  const createdDataSheet = await createDataSheet(token, name, data);
  const foundDataSheet = await findDataSheet(token, createdDataSheet.id!);
  await findDataSheet(token, "1234", 404);
  
  t.deepEqual(foundDataSheet, createdDataSheet);
  await deleteDataSheet(token, createdDataSheet.id!);

  await auth.removeUser1Roles([ApplicationRoles.MANAGE_DATA_SHEETS]);
});

test("Lists data sheet", async (t) => {
  const token = await auth.getTokenUser1([ApplicationRoles.MANAGE_DATA_SHEETS]);

  const createdDataSheets = await Promise.all([
    createDataSheet(token, "sheet-1", []),
    createDataSheet(token, "sheet-2", []),
    createDataSheet(token, "sheet-3", []),
  ]);

  const foundDataSheets = await listDataSheets(token);

  foundDataSheets.sort((a, b) => {
    return a.id!.localeCompare(b.id!);
  });

  createdDataSheets.sort((a, b) => {
    return a.id!.localeCompare(b.id!);
  });

  t.deepEqual(createdDataSheets, foundDataSheets);

  await Promise.all(createdDataSheets.map((createdDataSheet) => {
    return deleteDataSheet(token, createdDataSheet.id!);
  }));

  await auth.removeUser1Roles([ApplicationRoles.MANAGE_DATA_SHEETS]);
});

test("Deletes data sheet", async (t) => {
  const token = await auth.getTokenUser1([ApplicationRoles.MANAGE_DATA_SHEETS]);
  
  const name = "sheet-name";
  const data: string[][] = [
    ["1"], ["2"]
    ["2"], ["4"]
  ];

  const createdDataSheet = await createDataSheet(token, name, data);

  await findDataSheet(token, createdDataSheet.id!, 200);
  await deleteDataSheet(token, createdDataSheet.id!);
  await findDataSheet(token, createdDataSheet.id!, 404);
  
  await auth.removeUser1Roles([ApplicationRoles.MANAGE_DATA_SHEETS]);
});