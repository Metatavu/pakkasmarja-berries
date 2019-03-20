import * as test from "blue-tape"; 
import * as request from "supertest";
import auth from "./auth";
import { ChatGroup, ChatGroupType, ChatThread, ChatMessage } from "../rest/model/models";
import mqtt from "./mqtt";
import database from "./database";
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
 * Creates chat group
 * 
 * @param token token
 * @param title title
 * @param type type
 * @returns promise for chat group
 */
const createChatMessage = (token: string, threadId: number, contents: string): Promise<ChatMessage> => {
  const payload: ChatMessage = {
    id: null,
    contents: contents,
    threadId: threadId,
    createdAt: null,
    updatedAt: null,
    userId: null
  };

  return request("http://localhost:3002")
    .post(`/rest/v1/chatThreads/${threadId}/messages`)
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .send(payload)
    .expect(200)
    .then((response) => {
      return response.body;
    });
}

/**
 * Finds chat message
 * 
 * @param token token
 * @param threadId chat thread id
 * @param messageId chat message id
 * @param expectStatus expected http status. Defaults to 200
 * @returns promise for chat group
 */
const findChatMessage = (token: string, threadId: number, messageId: number, expectStatus?: number): Promise<ChatMessage> => {
  return request("http://localhost:3002")
    .get(`/rest/v1/chatThreads/${threadId}/messages/${messageId}`)
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .expect(expectStatus || 200)
    .then((response) => {
      return response.body;
    });  
}

/**
 * Lists chat messages
 * 
 * @param token token
 * @param threadId thread id
 * @returns promise for chat groups
 */
const listChatMessages = (token: string, threadId: number, createdBefore?: Date, createdAfter?: Date): Promise<ChatMessage[]> => {
  const query: string[] = [];

  if (createdBefore) {
    query.push(`createdBefore=${createdBefore.toISOString()}`);
  }

  if (createdAfter) {
    query.push(`createdAfter=${createdAfter.toISOString()}`);
  }
  
  return request("http://localhost:3002")
    .get(`/rest/v1/chatThreads/${threadId}/messages?${query.join("&")}`)
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .expect(200)
    .then((response) => {
      return response.body;
    });  
}

/**
 * Updates chat message
 * 
 * @param token token
 * @param id id
 * @param threadId thread id
 * @param contents contents
 * @returns promise for chat message
 */
const updateChatMessage = (token: string, id: number, threadId: number, contents: string): Promise<ChatMessage> => {
  const payload: ChatMessage = {
    id: null,
    contents: contents,
    createdAt: null,
    threadId: threadId,
    updatedAt: null,
    userId: null
  };

  return request("http://localhost:3002")
    .put(`/rest/v1/chatThreads/${threadId}/messages/${id}`)
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
 * Deletes chat message
 * 
 * @param token token
 * @param threadId chat thread id
 * @param messageId chat message id
 * @returns promise for delete
 */
const deleteChatMessage = async (token: string, threadId: number, messageId: number) => {
  return request("http://localhost:3002")
    .delete(`/rest/v1/chatThreads/${threadId}/messages/${messageId}`)
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .expect(204);
}

/**
 * Updates message createdAt value 
 * 
 * @param token token
 * @param message message
 * @param createdAt createdAt
 * @return updated message
 */
const updateMessageCreated = async (token: string, message: ChatMessage, createdAt: Date) => {
  await database.executeSql(`UPDATE Messages SET createdAt = FROM_UNIXTIME(${createdAt.getTime() / 1000}) WHERE id = ${message.id}`);
  return findChatMessage(token, message.threadId, message.id!);
}

/**
 * Returns Date object
 * 
 * @param year year
 * @param month month
 * @param date date
 * @returns Date object
 */
const getDate = (year: number, month: number, date: number) => {
  const result = new Date();
  result.setFullYear(year);
  result.setMonth(month);
  result.setDate(date);
  return result;
}

test("Create chat message", async (t) => {
  const token = await auth.getTokenUser1([ApplicationRoles.CREATE_CHAT_GROUPS]);
  
  await mqtt.subscribe("chatmessages");
  try {
    const createdChatGroup = await createChatGroup(token, "Group title (Create chat message)", "CHAT");
    const createdChatThread = await createChatThread(token, createdChatGroup.id!, "Thread title");
    const createdChatMessage = await createChatMessage(token, createdChatThread.id!, "Contents");

    await mqtt.expectMessage({
      "operation": "CREATED",
      "messageId": createdChatMessage.id,
      "threadId": createdChatThread.id,
      "groupId": createdChatGroup.id
    });    
    
    await deleteChatMessage(token, createdChatThread.id!, createdChatMessage.id!);
    await deleteChatThread(token, createdChatThread.id!);
    await deleteChatGroup(token, createdChatGroup.id!);
  } finally {
    await mqtt.unsubscribe("chatmessages");
  }

  await auth.removeUser1Roles([ApplicationRoles.CREATE_CHAT_GROUPS]);
});

test("Finds chat message", async (t) => {
  const token = await auth.getTokenUser1([ApplicationRoles.CREATE_CHAT_GROUPS]);

  const createdChatGroup = await createChatGroup(token, "Group title (Finds chat message)", "CHAT");
  const createdChatThread = await createChatThread(token, createdChatGroup.id!, "Thread title");
  const createdChatMessage = await createChatMessage(token, createdChatThread.id!, "Contents");
  const foundChatMessage = await findChatMessage(token, createdChatThread.id!, createdChatMessage.id!);

  await findChatMessage(token, 1234, 123, 404);
  await findChatMessage(token, createdChatThread.id!, 123, 404);
  await findChatMessage(token, 1234, createdChatMessage.id!, 404);

  t.deepEqual(foundChatMessage, createdChatMessage);

  await deleteChatMessage(token, createdChatThread.id!, createdChatMessage.id!);
  await deleteChatThread(token, createdChatThread.id!);    
  await deleteChatGroup(token, createdChatGroup.id!);

  await auth.removeUser1Roles([ApplicationRoles.CREATE_CHAT_GROUPS]);
});

test("Updates chat message", async (t) => {
  const token = await auth.getTokenUser1([ApplicationRoles.CREATE_CHAT_GROUPS]);

  const createdChatGroup = await createChatGroup(token, "Group title (Updates chat message)", "CHAT");
  const createdChatThread = await createChatThread(token, createdChatGroup.id!, "Thread title");
  const createdChatMessage = await createChatMessage(token, createdChatThread.id!, "Contents");

  const updatedMessage = await updateChatMessage(token, createdChatMessage.id!, createdChatThread.id!, "Updated");

  t.equal(updatedMessage.contents, "Updated");
  

  await deleteChatMessage(token, createdChatThread.id!, createdChatMessage.id!);
  await deleteChatThread(token, createdChatThread.id!);    
  await deleteChatGroup(token, createdChatGroup.id!);

  await auth.removeUser1Roles([ApplicationRoles.CREATE_CHAT_GROUPS]);
});

test("Lists chat messages", async (t) => {
  const token = await auth.getTokenUser1([ApplicationRoles.CREATE_CHAT_GROUPS]);

  const createdGroups = await Promise.all([
    createChatGroup(token, "Group 1", "CHAT"),
    createChatGroup(token, "Group 2", "CHAT")
  ]);

  const createdChatThreads = await Promise.all([
    await createChatThread(token, createdGroups[0].id!, "Thread 1.1"),
    await createChatThread(token, createdGroups[1].id!, "Thread 1.2")
  ]); 

  const createdMessages1 = await Promise.all([
    await createChatMessage(token, createdChatThreads[0].id!, "Message 1.1"),
    await createChatMessage(token, createdChatThreads[0].id!, "Message 1.2"),
    await createChatMessage(token, createdChatThreads[0].id!, "Message 1.3")
  ]); 

  createdMessages1.sort((a, b) => {
    return a.id! - b.id!;
  });

  const createdMessages2 = await Promise.all([
    await createChatMessage(token, createdChatThreads[1].id!, "Message 2.1"),
    await createChatMessage(token, createdChatThreads[1].id!, "Message 2.2")
  ]); 

  createdMessages2.sort((a, b) => {
    return a.id! - b.id!;
  });

  t.deepEqual(await listChatMessages(token, createdChatThreads[0].id!), createdMessages1);
  t.deepEqual(await listChatMessages(token, createdChatThreads[1].id!), createdMessages2);

  const messageCreated1 = getDate(2017, 3, 2);
  const messageCreated2 = getDate(2017, 3, 4);
  const messageCreated3 = getDate(2017, 3, 6);

  createdMessages1[0] = await updateMessageCreated(token, createdMessages1[0], messageCreated1);
  createdMessages1[1] = await updateMessageCreated(token, createdMessages1[1], messageCreated2);
  createdMessages1[2] = await updateMessageCreated(token, createdMessages1[2], messageCreated3);

  t.deepEqual(await listChatMessages(token, createdChatThreads[0].id!, getDate(2017, 3, 3), undefined), [ createdMessages1[0] ]);
  t.deepEqual(await listChatMessages(token, createdChatThreads[0].id!, undefined, getDate(2017, 3, 5)), [ createdMessages1[2] ]);
  t.deepEqual(await listChatMessages(token, createdChatThreads[0].id!, getDate(2017, 3, 5), getDate(2017, 3, 3)), [ createdMessages1[1] ]);

  await Promise.all(createdMessages1.map((message) => {
    return deleteChatMessage(token, message.threadId, message.id!);
  }));

  await Promise.all(createdMessages2.map((message) => {
    return deleteChatMessage(token, message.threadId, message.id!);
  }));

  await Promise.all(createdChatThreads.map((createdChatThread) => {
    return deleteChatThread(token, createdChatThread.id!);
  }));

  await Promise.all(createdGroups.map((createdGroup) => {
    return deleteChatGroup(token, createdGroup.id!);
  }));

  await auth.removeUser1Roles([ApplicationRoles.CREATE_CHAT_GROUPS]);
});

test("Deletes chat message", async (t) => {
  const token = await auth.getTokenUser1([ApplicationRoles.CREATE_CHAT_GROUPS]);

  await mqtt.subscribe("chatmessages");
  try {

    const createdChatGroup = await createChatGroup(token, "Group title (Deletes chat message)", "CHAT");
    const createdChatThread = await createChatThread(token, createdChatGroup.id!, "Thread title");
    const createdChatMessage = await createChatMessage(token, createdChatThread.id!, "Contents");

    await findChatMessage(token, createdChatThread.id!, createdChatMessage.id!, 200);
    await deleteChatMessage(token, createdChatThread.id!, createdChatMessage.id!);
    await findChatMessage(token, createdChatThread.id!, createdChatMessage.id!, 404);

    await deleteChatThread(token, createdChatThread.id!);    
    await deleteChatGroup(token, createdChatGroup.id!);

    await mqtt.expectMessage({
      "operation": "DELETED",
      "id": createdChatMessage.id
    });    

  } finally {
    await mqtt.unsubscribe("chatmessages");
  }

  await auth.removeUser1Roles([ApplicationRoles.CREATE_CHAT_GROUPS]);
});