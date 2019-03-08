import * as test from "blue-tape"; 
import * as request from "supertest";
import auth from "./auth";
import { ChatGroup, ChatGroupType } from "../rest/model/models";
import mqtt from "./mqtt";

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
  const token = await auth.getTokenUser1();  
  
  await mqtt.subscribe("chatgroups");
  try {
    const createdChatGroup = await createChatGroup(token, "Group title", "CHAT");
    t.notEqual(createdChatGroup, null);
    t.notEqual(createdChatGroup.id, null);
    t.equal(createdChatGroup.title, "Group title");
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
});

test("Finds chat group", async (t) => {
  const token = await auth.getTokenUser1();
  const createdChatGroup = await createChatGroup(token, "Group title", "CHAT");
  const foundChatGroup = await findChatGroup(token, createdChatGroup.id!);
  await findChatGroup(token, 1234, 404);
  
  t.deepEqual(foundChatGroup, createdChatGroup);
  await deleteChatGroup(token, createdChatGroup.id!);

  t.equal((await listChatGroups(token)).length, 0);
});

test("Updates chat group", async (t) => {
  const token = await auth.getTokenUser1();
  const createdChatGroup = await createChatGroup(token, "Group title", "CHAT");
  const foundChatGroup = await findChatGroup(token, createdChatGroup.id!);
  t.deepEqual(foundChatGroup, createdChatGroup);

  const updatedChatGroup = await updateChatGroup(token, createdChatGroup.id!, "New title", "QUESTION", "http://www.exmaple.com/image");

  t.equal(updatedChatGroup.title, "New title");
  t.equal(updatedChatGroup.imageUrl, "http://www.exmaple.com/image");
  await deleteChatGroup(token, createdChatGroup.id!);

  t.equal((await listChatGroups(token)).length, 0);
});

test("Lists chat group", async (t) => {
  const token = await auth.getTokenUser1();

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
});

test("Deletes chat group", async (t) => {
  const token = await auth.getTokenUser1();

  await mqtt.subscribe("chatgroups");
  try {
    const createdChatGroup = await createChatGroup(token, "Group title", "CHAT");

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
});