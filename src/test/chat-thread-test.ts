import * as test from "blue-tape"; 
import * as request from "supertest";
import auth from "./auth";
import { ChatGroup, ChatGroupType, ChatThread, ChatThreadGroupPermission, ChatGroupPermissionScope, ChatThreadPermissionScope, UserGroup, ChatGroupGroupPermission } from "../rest/model/models";
import mqtt from "./mqtt";
import ApplicationRoles from "../rest/application-roles";

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
  return request("http://localhost:3002")
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
 * Creates chat thread
 * 
 * @param token token
 * @param title title
 * @param type type
 * @returns promise for chat group
 */

/**
 * Creates chat thread
 *  
 * @param token token
 * @param groupId group id
 * @param title thread title
 * @param answerType answer type
 * @param description description
 * @param imageUrl image url
 * @param expiresAt expires at
 */
const createChatThread = (token: string, groupId: number, title: string, answerType?: ChatThread.AnswerTypeEnum, description?: string, imageUrl?: string, expiresAt?: Date): Promise<ChatGroup> => {
  const payload: ChatThread = {
    id: null,
    answerType: answerType || ChatThread.AnswerTypeEnum.TEXT,
    description: description || null,
    expiresAt: expiresAt || null,
    groupId: groupId,
    imageUrl: imageUrl || null,
    pollAllowOther: true,
    title: title
  };

  return request("http://localhost:3002")
    .post(`/rest/v1/chatThreads/`)
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .send(payload)
    .expect(200)
    .then((response) => {
      return response.body;
    });
}

/**
 * Finds chat thread
 * 
 * @param token token
 * @param id chat thread id
 * @param expectStatus expected http status. Defaults to 200
 * @returns promise for chat group
 */
const findChatThread = (token: string, id: number, expectStatus?: number): Promise<ChatGroup> => {
  return request("http://localhost:3002")
    .get(`/rest/v1/chatThreads/${id}`)
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .expect(expectStatus || 200)
    .then((response) => {
      return response.body;
    });  
}

/**
 * Lists chat threads
 * 
 * @param token token
 * @returns promise for chat groups
 */
const listChatThreads = (token: string, groupId?: number, groupType?: ChatGroupType): Promise<ChatGroup[]> => {
  const params = new URLSearchParams();

  if (groupId) {
    params.append("groupId", groupId.toString());
  }

  if (groupType) {
    params.append("groupType", groupType);
  }

  return request("http://localhost:3002")
    .get(`/rest/v1/chatThreads?${params.toString()}`)
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .expect(200)
    .then((response) => {
      const result: ChatGroup[] = response.body;
      result.sort((a, b) => {
        return a.id! - b.id!;
      });
      
      return result;      
    });  
}


/**
 * Updates chat thread
 * 
 * @param token token
 * @param id id
 * @param groupId group id
 * @param title thread title
 * @param answerType answer type
 * @param description description
 * @param imageUrl image url
 * @param expiresAt expires at
 * @returns promise for chat group
 */
const updateChatThread = (token: string, id: number, groupId: number, title: string, answerType?: ChatThread.AnswerTypeEnum, description?: string, imageUrl?: string, expiresAt?: Date): Promise<ChatThread> => {
  const payload: ChatThread = {
    id: null,
    answerType: answerType || ChatThread.AnswerTypeEnum.TEXT,
    description: description || null,
    expiresAt: expiresAt || null,
    groupId: groupId,
    imageUrl: imageUrl || null,
    pollAllowOther: true,
    title: title
  };

  return request("http://localhost:3002")
    .put(`/rest/v1/chatThreads/${id}`)
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

/**
 * Deletes chat thread
 * 
 * @param token token
 * @param threadId chat thread id
 * @returns promise for delete
 */
const deleteChatThread = async (token: string, threadId: number) => {
  return request("http://localhost:3002")
    .delete(`/rest/v1/chatThreads/${threadId}`)
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .expect(204);
}

/**
 * Creates chat group group permission
 * 
 * @param token token
 * @param title title
 * @param type type
 * @returns promise for chat group
 */
const createChatGroupGroupPermission = (token: string, chatGroupId: number, userGroupId: string, scope: ChatGroupPermissionScope): Promise<ChatGroupGroupPermission> => {
  const payload: ChatGroupGroupPermission = {
    id: null,
    chatGroupId: chatGroupId,
    userGroupId: userGroupId,
    scope: scope
  };

  return request("http://localhost:3002")
    .post(`/rest/v1/chatGroups/${chatGroupId}/groupPermissions`)
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .send(payload)
    .expect(200)
    .then((response) => {
      return response.body;
    });
}

/**
 * Creates chat group group permission
 * 
 * @param token token
 * @param title title
 * @param type type
 * @returns promise for chat group
 */
const createChatThreadGroupPermission = (token: string, chatThreadId: number, userGroupId: string, scope: ChatThreadPermissionScope): Promise<ChatThreadGroupPermission> => {
  const payload: ChatThreadGroupPermission = {
    id: null,
    chatThreadId: chatThreadId,
    userGroupId: userGroupId,
    scope: scope
  };

  return request("http://localhost:3002")
    .post(`/rest/v1/chatThreads/${chatThreadId}/groupPermissions`)
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .send(payload)
    .expect(200)
    .then((response) => {
      return response.body;
    });
}

/**
 * Update chat group group permission
 * 
 * @param token token
 * @param chatGroupId chatGroupId
 * @param payload payload
 * @returns promise for updated permission
 */
const updateChatThreadGroupPermission = (token: string, chatThreadId: number, payload: ChatThreadGroupPermission): Promise<ChatThreadGroupPermission> => {
  return request("http://localhost:3002")
    .put(`/rest/v1/chatThreads/${chatThreadId}/groupPermissions/${payload.id}`)
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .send(payload)
    .expect(200)
    .then((response) => {
      return response.body;
    });
}

/**
 * Finds chat group group permission
 * 
 * @param token token
 * @param chatGroupId chatGroupId
 * @param payload payload
 * @returns promise for updated permission
 */
const findChatThreadGroupPermission = (token: string, chatThreadId: number, id: string): Promise<ChatThreadGroupPermission> => {
  return request("http://localhost:3002")
    .get(`/rest/v1/chatThreads/${chatThreadId}/groupPermissions/${id}`)
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .expect(200)
    .then((response) => {
      return response.body;
    });
}

/**
 * List chat group group permissions
 * 
 * @param token token
 * @param id chat group id
 * @param expectStatus 
 * @returns promise for chat group group permissions
 */
const listChatThreadGroupPermissions = (token: string, chatThreadId: number, expectStatus?: number): Promise<ChatThreadGroupPermission[]> => {
  return request("http://localhost:3002")
    .get(`/rest/v1/chatThreads/${chatThreadId}/groupPermissions`)
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .expect(expectStatus || 200)
    .then((response) => {
      return response.body;
    });  
}

test("Test thread group permission create", async (t) => {
  const token = await auth.getTokenUser1([ApplicationRoles.CREATE_CHAT_GROUPS]);
  const userGroups = await listUserGroups(token);
  
  const createdChatGroup = await createChatGroup(token, "Group title (Finds chat group)", "CHAT");
  const createdChatThread = await createChatThread(token, createdChatGroup.id!, "Thread title");

  const createdPermission = await createChatThreadGroupPermission(token, createdChatThread.id!, userGroups[0].id!, "ACCESS");
  const foundPermissions = await listChatThreadGroupPermissions(token, createdChatThread.id!);

  t.deepEquals(foundPermissions, [createdPermission]);

  await deleteChatThread(token, createdChatThread.id!);    
  await deleteChatGroup(token, createdChatGroup.id!);

  t.equal((await listChatThreads(token)).length, 0);

  await auth.removeUser1Roles([ApplicationRoles.CREATE_CHAT_GROUPS]);
});

test("Test thread group permission list", async (t) => {
  const token = await auth.getTokenUser1([ApplicationRoles.CREATE_CHAT_GROUPS]);
  const userGroups = await listUserGroups(token);
  
  const createdChatGroup = await createChatGroup(token, "Group title (Finds chat group)", "CHAT");
  const createdChatThread = await createChatThread(token, createdChatGroup.id!, "Thread title");

  const createdPermission1 = await createChatThreadGroupPermission(token, createdChatThread.id!, userGroups[0].id!, "ACCESS");

  const foundPermissions = await listChatThreadGroupPermissions(token, createdChatThread.id!);

  t.equal(foundPermissions.length, 1);
  t.deepEquals(foundPermissions, [ createdPermission1 ]);

  await deleteChatThread(token, createdChatThread.id!);    
  await deleteChatGroup(token, createdChatGroup.id!);

  t.equal((await listChatThreads(token)).length, 0);

  await auth.removeUser1Roles([ApplicationRoles.CREATE_CHAT_GROUPS]);
});

test("Test thread group permission update", async (t) => {
  const token = await auth.getTokenUser1([ApplicationRoles.CREATE_CHAT_GROUPS]);
  const userGroups = await listUserGroups(token);
  
  const createdChatGroup = await createChatGroup(token, "Group title (Finds chat group)", "CHAT");
  const createdChatThread = await createChatThread(token, createdChatGroup.id!, "Thread title");

  const createdPermission = await createChatThreadGroupPermission(token, createdChatThread.id!, userGroups[0].id!, "ACCESS");
  t.equal(createdPermission.scope, "ACCESS");

  const updatedPermission: ChatThreadGroupPermission = await updateChatThreadGroupPermission(token, createdChatThread.id!, { ... createdPermission, scope: "ACCESS" });
  t.equal(updatedPermission.scope, "ACCESS");

  const foundPermission: ChatThreadGroupPermission = await findChatThreadGroupPermission(token, createdChatThread.id!, createdPermission.id!);
  t.equal(foundPermission.scope, "ACCESS");

  await deleteChatThread(token, createdChatThread.id!);    
  await deleteChatGroup(token, createdChatGroup.id!);

  t.equal((await listChatThreads(token)).length, 0);

  await auth.removeUser1Roles([ApplicationRoles.CREATE_CHAT_GROUPS]);
});

test("Create chat thread", async (t) => {
  const token = await auth.getTokenUser1([ApplicationRoles.CREATE_CHAT_GROUPS]);

  await mqtt.subscribe("chatthreads");
  try {
    const createdChatGroup = await createChatGroup(token, "Group title (Create chat thread)", "CHAT");
    const createdChatThread = await createChatThread(token, createdChatGroup.id!, "Thread title");

    await mqtt.expectMessage({
      "operation": "CREATED",
      "id": createdChatThread.id
    });    

    await deleteChatThread(token, createdChatThread.id!);    
    await deleteChatGroup(token, createdChatGroup.id!);
  } finally {
    await mqtt.unsubscribe("chatthreads");
  }

  t.equal((await listChatThreads(token)).length, 0);
  await auth.removeUser1Roles([ApplicationRoles.CREATE_CHAT_GROUPS]);
});

test("Finds chat group", async (t) => {
  const token = await auth.getTokenUser1([ApplicationRoles.CREATE_CHAT_GROUPS]);
  const createdChatGroup = await createChatGroup(token, "Group title (Finds chat group)", "CHAT");
  const createdChatThread = await createChatThread(token, createdChatGroup.id!, "Thread title");

  const foundChatThread = await findChatThread(token, createdChatThread.id!);
  await findChatThread(token, 1234, 404);
  
  t.deepEqual(foundChatThread, createdChatThread);

  await deleteChatThread(token, createdChatThread.id!);    
  await deleteChatGroup(token, createdChatGroup.id!);

  t.equal((await listChatThreads(token)).length, 0);

  await auth.removeUser1Roles([ApplicationRoles.CREATE_CHAT_GROUPS]);
});

test("Updates chat group", async (t) => {
  const token = await auth.getTokenUser1([ApplicationRoles.CREATE_CHAT_GROUPS]);
  const createdChatGroup = await createChatGroup(token, "Group title (Updates chat group)", "CHAT");
  const createdChatThread = await createChatThread(token, createdChatGroup.id!, "Thread title");
  const foundChatThread = await findChatThread(token, createdChatThread.id!);
  t.deepEqual(foundChatThread, createdChatThread);
  const expiresAt = "2019-03-09T15:31:50.000Z";

  const updatedChatThread = await updateChatThread(token, createdChatThread.id!, createdChatGroup.id!, "New title", "POLL", "Desc", "http://www.exmaple.com/image", new Date(Date.parse(expiresAt)));

  t.equal(updatedChatThread.title, "New title");
  t.equal(updatedChatThread.answerType, "POLL");
  t.equal(updatedChatThread.description, "Desc");
  t.equal(updatedChatThread.imageUrl, "http://www.exmaple.com/image");
  t.equal(updatedChatThread.expiresAt, expiresAt);

  await deleteChatThread(token, createdChatThread.id!);    
  await deleteChatGroup(token, createdChatGroup.id!);

  t.equal((await listChatThreads(token)).length, 0);

  await auth.removeUser1Roles([ApplicationRoles.CREATE_CHAT_GROUPS]);
});

test("Lists chat group", async (t) => {
  const token = await auth.getTokenUser1([ApplicationRoles.CREATE_CHAT_GROUPS]);

  const createdGroups = await Promise.all([
    createChatGroup(token, "Group 1", "CHAT"),
    createChatGroup(token, "Group 2", "CHAT"),
    createChatGroup(token, "Group 3", "QUESTION")
  ]);

  const createdChatThreads = await Promise.all([
    await createChatThread(token, createdGroups[0].id!, "Thread 1.1"),
    await createChatThread(token, createdGroups[0].id!, "Thread 1.2"),
    await createChatThread(token, createdGroups[1].id!, "Thread 2.1"),
    await createChatThread(token, createdGroups[1].id!, "Thread 2.2"),
    await createChatThread(token, createdGroups[2].id!, "Thread 3.1")
  ]); 
  
  t.deepEqual(await listChatThreads(token), createdChatThreads);
  t.deepEqual(await listChatThreads(token, createdGroups[0].id!), [ createdChatThreads[0], createdChatThreads[1] ]);
  t.deepEqual(await listChatThreads(token, undefined, "CHAT"), [ createdChatThreads[0], createdChatThreads[1], createdChatThreads[2], createdChatThreads[3] ]);
  
  await Promise.all(createdChatThreads.map((createdChatThread) => {
    return deleteChatThread(token, createdChatThread.id!);
  }));

  await Promise.all(createdGroups.map((createdGroup) => {
    return deleteChatGroup(token, createdGroup.id!);
  }));

  t.equal((await listChatThreads(token)).length, 0);

  await auth.removeUser1Roles([ApplicationRoles.CREATE_CHAT_GROUPS]);
});

test("Lists chat thread permissions", async (t) => {
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

  const createdGroups1 = await Promise.all([
    createChatGroup(token, "Group 1", "CHAT")
  ]);

  const createdGroups2 = await Promise.all([
    createChatGroup(token, "Group 2", "CHAT"),
    createChatGroup(token, "Group 3", "QUESTION")
  ]);

  const createdChatThreads1 = await Promise.all([
    await createChatThread(token, createdGroups1[0].id!, "Thread 1.1"),
    await createChatThread(token, createdGroups1[0].id!, "Thread 1.2"),
  ]); 

  const createdChatThreads2 = await Promise.all([
    await createChatThread(token, createdGroups2[0].id!, "Thread 2.1"),
    await createChatThread(token, createdGroups2[0].id!, "Thread 2.2"),
    await createChatThread(token, createdGroups2[1].id!, "Thread 3.1")
  ]); 
  
  await createChatGroupGroupPermission(token, createdGroups1[0].id!, userGroup1!.id!, "TRAVERSE");
  await createChatGroupGroupPermission(token, createdGroups2[0].id!, userGroup2!.id!, "TRAVERSE");
  await createChatGroupGroupPermission(token, createdGroups2[1].id!, userGroup2!.id!, "TRAVERSE");
  await createChatThreadGroupPermission(token, createdChatThreads1[0].id!, userGroup1!.id!, "ACCESS");
  await createChatThreadGroupPermission(token, createdChatThreads1[1].id!, userGroup1!.id!, "ACCESS");
  await createChatThreadGroupPermission(token, createdChatThreads2[0].id!, userGroup2!.id!, "ACCESS");
  await createChatThreadGroupPermission(token, createdChatThreads2[1].id!, userGroup2!.id!, "ACCESS");
  await createChatThreadGroupPermission(token, createdChatThreads2[2].id!, userGroup2!.id!, "ACCESS");

  t.deepEqual(await listChatThreads(token1), createdChatThreads1);
  t.deepEqual(await listChatThreads(token2), createdChatThreads2);
  
  await Promise.all(createdChatThreads1.map((createdChatThread) => {
    return deleteChatThread(token, createdChatThread.id!);
  }));

  await Promise.all(createdChatThreads2.map((createdChatThread) => {
    return deleteChatThread(token, createdChatThread.id!);
  }));

  await Promise.all(createdGroups1.map((createdGroup) => {
    return deleteChatGroup(token, createdGroup.id!);
  }));

  await Promise.all(createdGroups2.map((createdGroup) => {
    return deleteChatGroup(token, createdGroup.id!);
  }));

  await auth.removeAdminRoles([ApplicationRoles.CREATE_CHAT_GROUPS]);
});

test("Deletes chat thread", async (t) => {
  const token = await auth.getTokenUser1([ApplicationRoles.CREATE_CHAT_GROUPS]);

  await mqtt.subscribe("chatthreads");
  try {
    const createdChatGroup = await createChatGroup(token, "Group title (Deletes chat thread)", "CHAT");
    const createdChatThread = await createChatThread(token, createdChatGroup.id!, "Thread title");

    await findChatThread(token, createdChatThread.id!, 200);
    await deleteChatThread(token, createdChatThread.id!);
    await findChatThread(token, createdChatThread.id!, 404);
    
    await mqtt.expectMessage({
      "operation": "DELETED",
      "id": createdChatThread.id
    });
    
    await deleteChatGroup(token, createdChatGroup.id!);
  } finally {
    await mqtt.unsubscribe("chatthreads");
  }

  t.equal((await listChatThreads(token)).length, 0);

  await auth.removeUser1Roles([ApplicationRoles.CREATE_CHAT_GROUPS]);
});