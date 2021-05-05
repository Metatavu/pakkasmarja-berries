/**
 * Interface describing WireMock request count response
 */
export interface WireMockRequestCountResponse {
  count: number;
}

/**
 * Interface describing WireMock all requests response
 */
export interface WireMockAllRequestsResponse {
  requests: WireMockRequestResult[];
  meta: WireMockRequestsMeta;
  requestJournalDisabled: boolean;
}

/**
 * Interface describing WireMock request result
 */
export interface WireMockRequestResult {
  id: string;
  request: WireMockRequest;
  responseDefinition: WireMockResponseDefinition;
  wasMatched: boolean;
}

/**
 * Interface describing WireMock request
 */
export interface WireMockRequest {
  url: string;
  absoluteUrl: string;
  method: string;
  clientIp: string;
  headers: Record<string>;
  cookies: Record<string>;
  browserProxyRequest: boolean;
  loggedDate: number;
  bodyAsBase64: string;
  body: string;
  loggedDateString: Date;
}

/**
 * Interface describing WireMock response definition
 */
export interface WireMockResponseDefinition {
  status: number;
  body?: string;
  transformers?: string[];
  fromConfiguredStub: boolean;
  transformerParameters: Record<string>;
}

/**
 * Interface describing WireMock requests meta data
 */
export interface WireMockRequestsMeta {
  total: number;
}

/**
 * Interface describing key value record with string keys and values of given type
 */
export interface Record<T> {
  [key: string]: T;
}

/**
 * Union type for all request methods
 */
export type RequestMethod =
  "GET" |
  "HEAD" |
  "POST" |
  "PUT" |
  "DELETE" |
  "CONNECT" |
  "OPTIONS" |
  "TRACE" |
  "PATCH";