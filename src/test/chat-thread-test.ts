import * as test from "blue-tape"; 
import * as request from "supertest";
import auth from "./auth";
import { ChatGroup, ChatGroupType, ChatThread } from "../rest/model/models";
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
      return response.body;
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

test("Create chat thread", async (t) => {
  const token = await auth.getTokenUser1([ApplicationRoles.CREATE_CHAT_GROUPS]);

  await mqtt.subscribe("chatthreads");
  try {
    const createdChatGroup = await createChatGroup(token, "Group title (Create chat thread)", "CHAT");
    const createdChatThread = await createChatThread(token, createdChatGroup.id!, "Thread title");

    const messages = await mqtt.waitMessages(1);    
    t.deepEquals(messages, [{
      "operation": "CREATED",
      "id": createdChatThread.id
    }]);

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
  const token1 = await auth.getTokenUser1([ApplicationRoles.CREATE_CHAT_GROUPS]);
  const token2 = await auth.getTokenUser2([ApplicationRoles.CREATE_CHAT_GROUPS]);

  const createdGroups1 = await Promise.all([
    createChatGroup(token1, "Group 1", "CHAT")
  ]);

  const createdGroups2 = await Promise.all([
    createChatGroup(token2, "Group 2", "CHAT"),
    createChatGroup(token2, "Group 3", "QUESTION")
  ]);

  const createdChatThreads1 = await Promise.all([
    await createChatThread(token1, createdGroups1[0].id!, "Thread 1.1"),
    await createChatThread(token1, createdGroups1[0].id!, "Thread 1.2"),
  ]); 

  const createdChatThreads2 = await Promise.all([
    await createChatThread(token2, createdGroups2[0].id!, "Thread 2.1"),
    await createChatThread(token2, createdGroups2[0].id!, "Thread 2.2"),
    await createChatThread(token2, createdGroups2[1].id!, "Thread 3.1")
  ]); 
  
  t.deepEqual(await listChatThreads(token1), createdChatThreads1);
  
  await Promise.all(createdChatThreads1.map((createdChatThread) => {
    return deleteChatThread(token1, createdChatThread.id!);
  }));

  await Promise.all(createdChatThreads2.map((createdChatThread) => {
    return deleteChatThread(token2, createdChatThread.id!);
  }));

  await Promise.all(createdGroups1.map((createdGroup) => {
    return deleteChatGroup(token1, createdGroup.id!);
  }));

  await Promise.all(createdGroups2.map((createdGroup) => {
    return deleteChatGroup(token2, createdGroup.id!);
  }));

  await auth.removeUser1Roles([ApplicationRoles.CREATE_CHAT_GROUPS]);
  await auth.removeUser2Roles([ApplicationRoles.CREATE_CHAT_GROUPS]);
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
    
    const messages = await mqtt.waitMessages(2);
    t.deepEquals(messages, [{
      "operation": "CREATED",
      "id": createdChatThread.id
    }, {
      "operation": "DELETED",
      "id": createdChatThread.id
    }]);
    
    await deleteChatGroup(token, createdChatGroup.id!);
  } finally {
    await mqtt.unsubscribe("chatthreads");
  }

  t.equal((await listChatThreads(token)).length, 0);

  await auth.removeUser1Roles([ApplicationRoles.CREATE_CHAT_GROUPS]);
});