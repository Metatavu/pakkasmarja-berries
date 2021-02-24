import * as test from "blue-tape"; 
import * as request from "supertest";
import chatPermissions from "./chat-permissions";
import auth from "./auth";
import { ChatGroup, ChatGroupType, UserGroup } from "../rest/model/models";
import mqtt from "./mqtt";
import ApplicationRoles from "../rest/application-roles";
import { ChatGroupGroupPermission } from "../rest/model/chatGroupGroupPermission";
import TestConfig from "./test-config";

/**
 * Sorts list by id
 * 
 * @param list list
 * @return sorted list
 */
const sorted = (list: any[]) => {
  list.sort((a, b) => {
    return a.id! - b.id!;
  });
  
  return list;
}

/**
 * Lists chat groups
 * 
 * @param token token
 * @returns promise for chat groups
 */
const listUserGroups = (token: string): Promise<UserGroup[]> => {
  return request(TestConfig.HOST)
    .get(`/rest/v1/userGroups`)
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .expect(200)
    .then((response) => {
      return sorted(response.body);
    });  
}

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

  return request(TestConfig.HOST)
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
  return request(TestConfig.HOST)
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
  return request(TestConfig.HOST)
    .get(`/rest/v1/chatGroups`)
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .expect(200)
    .then((response) => {
      return sorted(response.body);
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

  return request(TestConfig.HOST)
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
  return request(TestConfig.HOST)
    .delete(`/rest/v1/chatGroups/${id}`)
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .expect(204);
}

test("Test group permission create", async (t) => {
  const token = await auth.getTokenUser1([ApplicationRoles.CREATE_CHAT_GROUPS]);  
  const userGroups = await listUserGroups(token);
  const createdChatGroup = await createChatGroup(token, "Group title (Test group permission list)", "CHAT");
  t.notEqual(createdChatGroup, null);
  t.notEqual(createdChatGroup.id, null);

  const createdPermission = await chatPermissions.createChatGroupGroupPermission(token, createdChatGroup.id!, userGroups[0].id!, "MANAGE");
  const foundPermissions = await chatPermissions.listChatGroupGroupPermissions(token, createdChatGroup.id!);

  t.deepEquals(foundPermissions, [createdPermission]);

  await deleteChatGroup(token, createdChatGroup.id!);

  t.equal((await listChatGroups(token)).length, 0);

  await auth.removeUser1Roles([ApplicationRoles.CREATE_CHAT_GROUPS]);
});

test("Test group permission list", async (t) => {
  const token = await auth.getTokenUser1([ApplicationRoles.CREATE_CHAT_GROUPS]);  
  const userGroups = await listUserGroups(token);

  const createdChatGroup = await createChatGroup(token, "Group title (Test group permission list)", "CHAT");
  t.notEqual(createdChatGroup, null);
  t.notEqual(createdChatGroup.id, null);

  const createdPermission1 = await chatPermissions.createChatGroupGroupPermission(token, createdChatGroup.id!, userGroups[0].id!, "MANAGE");
  const createdPermission2 = await chatPermissions.createChatGroupGroupPermission(token, createdChatGroup.id!, userGroups[1].id!, "ACCESS");
  const createdPermission3 = await chatPermissions.createChatGroupGroupPermission(token, createdChatGroup.id!, userGroups[2].id!, "TRAVERSE");

  const foundPermissions = await chatPermissions.listChatGroupGroupPermissions(token, createdChatGroup.id!);

  t.equal(foundPermissions.length, 3);
  t.deepEquals(foundPermissions, [createdPermission1, createdPermission2, createdPermission3]);

  await deleteChatGroup(token, createdChatGroup.id!);
  t.equal((await listChatGroups(token)).length, 0);

  await auth.removeUser1Roles([ApplicationRoles.CREATE_CHAT_GROUPS]);
});

test("Test group permission update", async (t) => {
  const token = await auth.getTokenUser1([ApplicationRoles.CREATE_CHAT_GROUPS]);  
  const userGroups = await listUserGroups(token);

  const createdChatGroup = await createChatGroup(token, "Group title (Test group permission list)", "CHAT");
  t.notEqual(createdChatGroup, null);
  t.notEqual(createdChatGroup.id, null);

  const createdPermission: ChatGroupGroupPermission = await chatPermissions.createChatGroupGroupPermission(token, createdChatGroup.id!, userGroups[0].id!, "MANAGE");
  t.equal(createdPermission.scope, "MANAGE");

  const updatedPermission: ChatGroupGroupPermission = await chatPermissions.updateChatGroupGroupPermission(token, createdChatGroup.id!, { ... createdPermission, scope: "ACCESS" });
  t.equal(updatedPermission.scope, "ACCESS");

  const foundPermission: ChatGroupGroupPermission = await chatPermissions.findChatGroupGroupPermission(token, createdChatGroup.id!, createdPermission.id!);
  t.equal(foundPermission.scope, "ACCESS");

  await deleteChatGroup(token, createdChatGroup.id!);

  t.equal((await listChatGroups(token)).length, 0);

  await auth.removeUser1Roles([ApplicationRoles.CREATE_CHAT_GROUPS]);
});

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

    await mqtt.expectMessage({
      "operation": "CREATED",
      "id": createdChatGroup.id
    });

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

  const createdGroups = sorted(await Promise.all([
    createChatGroup(token, "Group 1", "CHAT"),
    createChatGroup(token, "Group 2", "CHAT"),
    createChatGroup(token, "Group 3", "CHAT"),
  ]));

  const foundGroups = await listChatGroups(token);

  t.deepEqual(createdGroups, foundGroups);

  await Promise.all(createdGroups.map((createdGroup) => {
    return deleteChatGroup(token, createdGroup.id!);
  }));

  t.equal((await listChatGroups(token)).length, 0);

  await auth.removeUser1Roles([ApplicationRoles.CREATE_CHAT_GROUPS]);
});

test("Lists chat group permissions", async (t) => {
  const token = await auth.getAdminToken([ApplicationRoles.CREATE_CHAT_GROUPS]);

  const userGroups = await listUserGroups(token);

  const userGroup1 = userGroups.find((userGroup) => {
    return userGroup.name == "testgroup1";
  });

  t.notEqual(userGroup1, null);

  const userGroup2 = userGroups.find((userGroup) => {
    return userGroup.name == "testgroup2";
  });

  t.notEqual(userGroup2, null);

  const token1 = await auth.getTokenUser1([]);
  const token2 = await auth.getTokenUser2([]);

  const createdGroups1 = sorted(await Promise.all([
    createChatGroup(token, "Group 1", "CHAT"),
    createChatGroup(token, "Group 2", "CHAT"),
  ]));

  await chatPermissions.createChatGroupGroupPermission(token, createdGroups1[0].id!, userGroup1!.id!, "ACCESS");
  await chatPermissions.createChatGroupGroupPermission(token, createdGroups1[1].id!, userGroup1!.id!, "ACCESS");

  const createdGroups2 = sorted(await Promise.all([
    createChatGroup(token, "Group 3", "CHAT"),
  ]));

  await chatPermissions.createChatGroupGroupPermission(token, createdGroups2[0].id!, userGroup2!.id!, "ACCESS");

  const foundGroups1 = await listChatGroups(token1);
  const foundGroups2 = await listChatGroups(token2);

  t.deepEqual(foundGroups1, createdGroups1);
  t.deepEqual(foundGroups2, createdGroups2);

  await Promise.all(createdGroups1.map((createdGroup) => {
    return deleteChatGroup(token, createdGroup.id!);
  }));

  await Promise.all(createdGroups2.map((createdGroup) => {
    return deleteChatGroup(token, createdGroup.id!);
  }));

  t.equal((await listChatGroups(token1)).length, 0);
  t.equal((await listChatGroups(token2)).length, 0);

  await auth.removeAdminRoles([ApplicationRoles.CREATE_CHAT_GROUPS]);
});

test("Deletes chat group", async (t) => {
  const token = await auth.getTokenUser1([ApplicationRoles.CREATE_CHAT_GROUPS]);

  await mqtt.subscribe("chatgroups");
  try {
    const createdChatGroup = await createChatGroup(token, "Group title (Deletes chat group)", "CHAT");
    await findChatGroup(token, createdChatGroup.id!, 200);
    await deleteChatGroup(token, createdChatGroup.id!);
    await findChatGroup(token, createdChatGroup.id!, 404);

    await mqtt.expectMessage({
      "operation": "DELETED",
      "id": createdChatGroup.id
    });

  } finally {
    await mqtt.unsubscribe("chatgroups");
  }

  t.equal((await listChatGroups(token)).length, 0);

  await auth.removeUser1Roles([ApplicationRoles.CREATE_CHAT_GROUPS]);
});