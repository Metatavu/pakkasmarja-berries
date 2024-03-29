/* tslint:disable */
/* eslint-disable */
/**
 * Keycloak Admin REST API
 * This is a REST API reference for the Keycloak Admin REST API.
 *
 * The version of the OpenAPI document: 1.0
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { mapValues } from '../runtime';
/**
 * 
 * @export
 * @interface GlobalRequestResult
 */
export interface GlobalRequestResult {
    /**
     * 
     * @type {Array<string>}
     * @memberof GlobalRequestResult
     */
    successRequests?: Array<string>;
    /**
     * 
     * @type {Array<string>}
     * @memberof GlobalRequestResult
     */
    failedRequests?: Array<string>;
}

/**
 * Check if a given object implements the GlobalRequestResult interface.
 */
export function instanceOfGlobalRequestResult(value: object): boolean {
    return true;
}

export function GlobalRequestResultFromJSON(json: any): GlobalRequestResult {
    return GlobalRequestResultFromJSONTyped(json, false);
}

export function GlobalRequestResultFromJSONTyped(json: any, ignoreDiscriminator: boolean): GlobalRequestResult {
    if (json == null) {
        return json;
    }
    return {
        
        'successRequests': json['successRequests'] == null ? undefined : json['successRequests'],
        'failedRequests': json['failedRequests'] == null ? undefined : json['failedRequests'],
    };
}

export function GlobalRequestResultToJSON(value?: GlobalRequestResult | null): any {
    if (value == null) {
        return value;
    }
    return {
        
        'successRequests': value['successRequests'],
        'failedRequests': value['failedRequests'],
    };
}

