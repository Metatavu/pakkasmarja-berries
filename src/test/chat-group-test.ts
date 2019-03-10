import * as test from "blue-tape"; 
import * as request from "supertest";
import auth from "./auth";
import { ChatGroup, ChatGroupType } from "../rest/model/models";
import mqtt from "./mqtt";
import ApplicationRoles from "../rest/application-roles";

/**
 * Creates chat group
 * 
 * @param token token
 * @param title title
 * @param type type
 * @returns promise for chat group
 */
const createChatGroup = (token: string, title: string, type: ChatGroupType): Promise<ChatGroup> => {
  const payload: ChatGroup = {
    id: null,
    title: title,
    type: type,
    imageUrl: null
  };

  return request("http://localhost:3002")
    .post("/rest/v1/chatGroups")
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .send(payload)
    .expect(200)
    .then((response) => {
      return response.body;
    });
}

/**
 * Finds chat group
 * 
 * @param token token
 * @param id chat group id
 * @param expectStatus 
 * @returns promise for chat group
 */
const findChatGroup = (token: string, id: number, expectStatus?: number): Promise<ChatGroup> => {
  return request("http://localhost:3002")
    .get(`/rest/v1/chatGroups/${id}`)
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .expect(expectStatus || 200)
    .then((response) => {
      return response.body;
    });  
}

/**
 * Lists chat groups
 * 
 * @param token token
 * @returns promise for chat groups
 */
const listChatGroups = (token: string): Promise<ChatGroup[]> => {
  return request("http://localhost:3002")
    .get(`/rest/v1/chatGroups`)
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .expect(200)
    .then((response) => {
      return response.body;
    });  
}

/**
 * Updates chat group
 * 
 * @param token token
 * @param title title
 * @param type type
 * @param imageUrl image url
 * @returns promise for chat group
 */
const updateChatGroup = (token: string, id: number, title: string, type: ChatGroupType, imageUrl: string | null): Promise<ChatGroup> => {
  const payload: ChatGroup = {
    id: id,
    title: title,
    type: type,
    imageUrl: imageUrl
  };

  return request("http://localhost:3002")
    .put(`/rest/v1/chatGroups/${id}`)
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .send(payload)
    .expect(200)
    .then((response) => {
      return response.body;
    });
}

/**
 * Deletes chat group
 * 
 * @param token token
 * @param id chat group id
 * @returns promise for delete
 */
const deleteChatGroup = async (token: string, id: number) => {
  return request("http://localhost:3002")
    .delete(`/rest/v1/chatGroups/${id}`)
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .expect(204);
}

test("Create chat group", async (t) => {
  const token = await auth.getTokenUser1([ApplicationRoles.CREATE_CHAT_GROUPS]);  
  
  await mqtt.subscribe("chatgroups");
  try {
    const createdChatGroup = await createChatGroup(token, "Group title (Create chat group)", "CHAT");
    t.notEqual(createdChatGroup, null);
    t.notEqual(createdChatGroup.id, null);
    t.equal(createdChatGroup.title, "Group title (Create chat group)");
    t.equal(createdChatGroup.type,  "CHAT");
    t.equal(createdChatGroup.imageUrl, null);

    const messages = await mqtt.waitMessages(1);    
    t.deepEquals(messages, [{
      "operation": "CREATED",
      "id": createdChatGroup.id
    }]);
    
    await deleteChatGroup(token, createdChatGroup.id!);
  } finally {
    await mqtt.unsubscribe("chatgroups");
  }

  t.equal((await listChatGroups(token)).length, 0);

  await auth.removeUser1Roles([ApplicationRoles.CREATE_CHAT_GROUPS]);
});

test("Finds chat group", async (t) => {
  const token = await auth.getTokenUser1([ApplicationRoles.CREATE_CHAT_GROUPS]);
  const createdChatGroup = await createChatGroup(token, "Group title (Finds chat group)", "CHAT");
  const foundChatGroup = await findChatGroup(token, createdChatGroup.id!);
  await findChatGroup(token, 1234, 404);
  
  t.deepEqual(foundChatGroup, createdChatGroup);
  await deleteChatGroup(token, createdChatGroup.id!);

  t.equal((await listChatGroups(token)).length, 0);

  await auth.removeUser1Roles([ApplicationRoles.CREATE_CHAT_GROUPS]);
});

test("Updates chat group", async (t) => {
  const token = await auth.getTokenUser1([ApplicationRoles.CREATE_CHAT_GROUPS]);
  const createdChatGroup = await createChatGroup(token, "Group title (Updates chat group)", "CHAT");
  const foundChatGroup = await findChatGroup(token, createdChatGroup.id!);
  t.deepEqual(foundChatGroup, createdChatGroup);

  const updatedChatGroup = await updateChatGroup(token, createdChatGroup.id!, "New title", "QUESTION", "http://www.exmaple.com/image");

  t.equal(updatedChatGroup.title, "New title");
  t.equal(updatedChatGroup.imageUrl, "http://www.exmaple.com/image");
  await deleteChatGroup(token, createdChatGroup.id!);

  t.equal((await listChatGroups(token)).length, 0);
});

test("Lists chat group", async (t) => {
  const token = await auth.getTokenUser1([ApplicationRoles.CREATE_CHAT_GROUPS]);

  const createdGroups = await Promise.all([
    createChatGroup(token, "Group 1", "CHAT"),
    createChatGroup(token, "Group 2", "CHAT"),
    createChatGroup(token, "Group 3", "CHAT"),
  ]);

  const foundGroups = await listChatGroups(token);

  t.deepEqual(createdGroups, foundGroups);

  await Promise.all(createdGroups.map((createdGroup) => {
    return deleteChatGroup(token, createdGroup.id!);
  }));

  t.equal((await listChatGroups(token)).length, 0);

  await auth.removeUser1Roles([ApplicationRoles.CREATE_CHAT_GROUPS]);
});

test("Lists chat group permissions", async (t) => {
  const token1 = await auth.getTokenUser1([ApplicationRoles.CREATE_CHAT_GROUPS]);
  const token2 = await auth.getTokenUser2([ApplicationRoles.CREATE_CHAT_GROUPS]);

  const createdGroups1 = await Promise.all([
    createChatGroup(token1, "Group 1", "CHAT"),
    createChatGroup(token1, "Group 2", "CHAT"),
  ]);

  const createdGroups2 = await Promise.all([
    createChatGroup(token2, "Group 3", "CHAT"),
  ]);

  const foundGroups1 = await listChatGroups(token1);
  const foundGroups2 = await listChatGroups(token2);

  t.deepEqual(createdGroups1, foundGroups1);
  t.deepEqual(createdGroups2, foundGroups2);

  await Promise.all(createdGroups1.map((createdGroup) => {
    return deleteChatGroup(token1, createdGroup.id!);
  }));

  await Promise.all(createdGroups2.map((createdGroup) => {
    return deleteChatGroup(token2, createdGroup.id!);
  }));

  t.equal((await listChatGroups(token1)).length, 0);
  t.equal((await listChatGroups(token2)).length, 0);

  await auth.removeUser1Roles([ApplicationRoles.CREATE_CHAT_GROUPS]);
  await auth.removeUser2Roles([ApplicationRoles.CREATE_CHAT_GROUPS]);
});

test("Deletes chat group", async (t) => {
  const token = await auth.getTokenUser1([ApplicationRoles.CREATE_CHAT_GROUPS]);

  await mqtt.subscribe("chatgroups");
  try {
    const createdChatGroup = await createChatGroup(token, "Group title (Deletes chat group)", "CHAT");
    await findChatGroup(token, createdChatGroup.id!, 200);
    await deleteChatGroup(token, createdChatGroup.id!);
    await findChatGroup(token, createdChatGroup.id!, 404);

    const messages = await mqtt.waitMessages(2);
    t.deepEquals(messages, [{
      "operation": "CREATED",
      "id": createdChatGroup.id
    }, {
      "operation": "DELETED",
      "id": createdChatGroup.id
    }]);
  } finally {
    await mqtt.unsubscribe("chatgroups");
  }

  t.equal((await listChatGroups(token)).length, 0);

  await auth.removeUser1Roles([ApplicationRoles.CREATE_CHAT_GROUPS]);
});