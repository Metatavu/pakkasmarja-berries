import * as test from "blue-tape"; 
import * as request from "supertest";
import auth from "./auth";
import ApplicationRoles from "../rest/application-roles";
import { NewsArticle } from "../rest/model/models";
import mqtt from "./mqtt";

/**
 * Creates news article
 * 
 * @param token token
 * @param title title
 * @param contents contents
 * @returns promise for news article
 */
const createNewsArticle = (token: string, title: string, contents: string): Promise<NewsArticle> => {
  const payload: NewsArticle = {
    id: null,
    title: title,
    contents: contents,
    createdAt: null,
    updatedAt: null,
    imageUrl: null
  };

  return request("http://localhost:3002")
    .post("/rest/v1/newsArticles")
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .send(payload)
    .expect(200)
    .then((response) => {
      return response.body;
    });
}

/**
 * Finds news article
 * 
 * @param token token
 * @param id news article id
 * @param expectStatus 
 * @returns promise for news article
 */
const findNewsArticle = (token: string, id: number, expectStatus?: number): Promise<NewsArticle> => {
  return request("http://localhost:3002")
    .get(`/rest/v1/newsArticles/${id}`)
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .expect(expectStatus || 200)
    .then((response) => {
      return response.body;
    });  
}

/**
 * Lists news articles
 * 
 * @param token token
 * @returns promise for news articles
 */
const listNewsArticles = (token: string): Promise<NewsArticle[]> => {
  return request("http://localhost:3002")
    .get(`/rest/v1/newsArticles`)
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .expect(200)
    .then((response) => {
      return response.body;
    });  
}

/**
 * Deletes news article
 * 
 * @param token token
 * @param id news article id
 * @returns promise for delete
 */
const deleteNewsArticle = async (token: string, id: number) => {
  return request("http://localhost:3002")
    .delete(`/rest/v1/newsArticles/${id}`)
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .expect(204);
}

test("Create news article", async (t) => {
  const token = await auth.getTokenUser1([ApplicationRoles.MANAGE_NEWS_ARTICLES]);
  
  await mqtt.subscribe("newsarticles");
  try {
    const createdNewsArticle = await createNewsArticle(token, "Article title", "Article content");
    t.notEqual(createdNewsArticle, null);
    t.notEqual(createdNewsArticle.id, null);
    t.equal(createdNewsArticle.title, "Article title");
    t.equal(createdNewsArticle.contents,  "Article content");
    t.notEqual(createdNewsArticle.createdAt, null);
    t.notEqual(createdNewsArticle.updatedAt, null);
    t.equal(createdNewsArticle.imageUrl, null);

    const messages = await mqtt.waitMessages(1);    
    t.deepEquals(messages, [{
      "operation": "CREATED",
      "id": createdNewsArticle.id
    }]);

    await deleteNewsArticle(token, createdNewsArticle.id!);
  } finally {
    await mqtt.unsubscribe("newsarticles");
  }
});

test("Finds news article", async (t) => {
  const token = await auth.getTokenUser1([ApplicationRoles.MANAGE_NEWS_ARTICLES]);

  const createdNewsArticle = await createNewsArticle(token, "Article title", "Article content");
  const foundNewsArticle = await findNewsArticle(token, createdNewsArticle.id!);
  await findNewsArticle(token, 1234, 404);
  
  t.deepEqual(foundNewsArticle, createdNewsArticle);
  await deleteNewsArticle(token, createdNewsArticle.id!);
});

test("Lists news article", async (t) => {
  const token = await auth.getTokenUser1([ApplicationRoles.MANAGE_NEWS_ARTICLES]);

  const createdArticles = await Promise.all([
    createNewsArticle(token, "Article 1", "Content 1"),
    createNewsArticle(token, "Article 2", "Content 2"),
    createNewsArticle(token, "Article 3", "Content 3"),
  ]);

  const foundArticles = await listNewsArticles(token);

  t.deepEqual(createdArticles, foundArticles);

  await Promise.all(createdArticles.map((createdArticle) => {
    return deleteNewsArticle(token, createdArticle.id!);
  }));
});

test("Deletes news article", async (t) => {
  const token = await auth.getTokenUser1([ApplicationRoles.MANAGE_NEWS_ARTICLES]);

  await mqtt.subscribe("newsarticles");
  try {
    const createdNewsArticle = await createNewsArticle(token, "Article title", "Article content");

    await findNewsArticle(token, createdNewsArticle.id!, 200);
    await deleteNewsArticle(token, createdNewsArticle.id!);
    await findNewsArticle(token, createdNewsArticle.id!, 404);

    const messages = await mqtt.waitMessages(2);
    t.deepEquals(messages, [{
      "operation": "CREATED",
      "id": createdNewsArticle.id
    }, {
      "operation": "DELETED",
      "id": createdNewsArticle.id
    }]);

  } finally {
    await mqtt.unsubscribe("newsarticles");
  }
});