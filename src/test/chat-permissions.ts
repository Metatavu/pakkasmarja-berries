import * as request from "supertest";
import { ChatGroupGroupPermission } from "../rest/model/chatGroupGroupPermission";
import { ChatThreadPermissionScope, ChatGroupPermissionScope, ChatThreadGroupPermission, ChatThreadUserPermission } from "../rest/model/models";

export default new class ChatPermissions {

  /**
   * Creates chat group group permission
   * 
   * @param token token
   * @param title title
   * @param type type
   * @returns promise for chat group
   */
  public createChatGroupGroupPermission = (token: string, chatGroupId: number, userGroupId: string, scope: ChatGroupPermissionScope): Promise<ChatGroupGroupPermission> => {
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
   * Update chat group group permission
   * 
   * @param token token
   * @param chatGroupId chatGroupId
   * @param payload payload
   * @returns promise for updated permission
   */
  public updateChatGroupGroupPermission = (token: string, chatGroupId: number, payload: ChatGroupGroupPermission): Promise<ChatGroupGroupPermission> => {
    return request("http://localhost:3002")
      .put(`/rest/v1/chatGroups/${chatGroupId}/groupPermissions/${payload.id}`)
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
  public findChatGroupGroupPermission = (token: string, chatGroupId: number, id: string): Promise<ChatGroupGroupPermission> => {
    return request("http://localhost:3002")
      .get(`/rest/v1/chatGroups/${chatGroupId}/groupPermissions/${id}`)
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
  public listChatGroupGroupPermissions = (token: string, id: number, expectStatus?: number): Promise<ChatGroupGroupPermission[]> => {
    return request("http://localhost:3002")
      .get(`/rest/v1/chatGroups/${id}/groupPermissions`)
      .set("Authorization", `Bearer ${token}`)
      .set("Accept", "application/json")
      .expect(expectStatus || 200)
      .then((response) => {
        return response.body;
      });  
  }

  /**
   * Delete chat group group permission
   * 
   * @param token token
   * @param chatThreadId chatThreadId
   * @returns promise for delete permission
   */
  public deleteChatGroupGroupPermission = (token: string, chatGroupId: number, id: string): Promise<void> => {
    return request("http://localhost:3002")
      .delete(`/rest/v1/chatGroups/${chatGroupId}/groupPermissions/${id}`)
      .set("Authorization", `Bearer ${token}`)
      .set("Accept", "application/json")
      .expect(204)
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
  public createChatThreadGroupPermission = (token: string, chatThreadId: number, userGroupId: string, scope: ChatThreadPermissionScope): Promise<ChatThreadGroupPermission> => {
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
  public updateChatThreadGroupPermission = (token: string, chatThreadId: number, payload: ChatThreadGroupPermission): Promise<ChatThreadGroupPermission> => {
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
  public findChatThreadGroupPermission = (token: string, chatThreadId: number, id: string): Promise<ChatThreadGroupPermission> => {
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
  public listChatThreadGroupPermissions = (token: string, chatThreadId: number, expectStatus?: number): Promise<ChatThreadGroupPermission[]> => {
    return request("http://localhost:3002")
      .get(`/rest/v1/chatThreads/${chatThreadId}/groupPermissions`)
      .set("Authorization", `Bearer ${token}`)
      .set("Accept", "application/json")
      .expect(expectStatus || 200)
      .then((response) => {
        return response.body;
      });  
  }

  /**
   * Creates chat user user permission
   * 
   * @param token token
   * @param title title
   * @param type type
   * @returns promise for chat user
   */
  public createChatThreadUserPermission = (token: string, chatThreadId: number, userId: string, scope: ChatThreadPermissionScope): Promise<ChatThreadUserPermission> => {
    const payload: ChatThreadUserPermission = {
      id: null,
      chatThreadId: chatThreadId,
      userId: userId,
      scope: scope
    };

    return request("http://localhost:3002")
      .post(`/rest/v1/chatThreads/${chatThreadId}/userPermissions`)
      .set("Authorization", `Bearer ${token}`)
      .set("Accept", "application/json")
      .send(payload)
      .expect(200)
      .then((response) => {
        return response.body;
      });
  }

  /**
   * Update chat user user permission
   * 
   * @param token token
   * @param chatUserId chatUserId
   * @param payload payload
   * @returns promise for updated permission
   */
  public updateChatThreadUserPermission = (token: string, chatThreadId: number, payload: ChatThreadUserPermission): Promise<ChatThreadUserPermission> => {
    return request("http://localhost:3002")
      .put(`/rest/v1/chatThreads/${chatThreadId}/userPermissions/${payload.id}`)
      .set("Authorization", `Bearer ${token}`)
      .set("Accept", "application/json")
      .send(payload)
      .expect(200)
      .then((response) => {
        return response.body;
      });
  }

  /**
   * Finds chat user user permission
   * 
   * @param token token
   * @param chatUserId chatUserId
   * @param payload payload
   * @returns promise for updated permission
   */
  public findChatThreadUserPermission = (token: string, chatThreadId: number, id: string): Promise<ChatThreadUserPermission> => {
    return request("http://localhost:3002")
      .get(`/rest/v1/chatThreads/${chatThreadId}/userPermissions/${id}`)
      .set("Authorization", `Bearer ${token}`)
      .set("Accept", "application/json")
      .expect(200)
      .then((response) => {
        return response.body;
      });
  }

  /**
   * List chat user user permissions
   * 
   * @param token token
   * @param id chat user id
   * @param expectStatus 
   * @returns promise for chat user user permissions
   */
  public listChatThreadUserPermissions = (token: string, chatThreadId: number, expectStatus?: number): Promise<ChatThreadUserPermission[]> => {
    return request("http://localhost:3002")
      .get(`/rest/v1/chatThreads/${chatThreadId}/userPermissions`)
      .set("Authorization", `Bearer ${token}`)
      .set("Accept", "application/json")
      .expect(expectStatus || 200)
      .then((response) => {
        return response.body;
      });   
    }
}