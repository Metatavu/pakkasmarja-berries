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
 * @interface ClientInitialAccessCreatePresentation
 */
export interface ClientInitialAccessCreatePresentation {
    /**
     * 
     * @type {number}
     * @memberof ClientInitialAccessCreatePresentation
     */
    expiration?: number;
    /**
     * 
     * @type {number}
     * @memberof ClientInitialAccessCreatePresentation
     */
    count?: number;
}

/**
 * Check if a given object implements the ClientInitialAccessCreatePresentation interface.
 */
export function instanceOfClientInitialAccessCreatePresentation(value: object): boolean {
    return true;
}

export function ClientInitialAccessCreatePresentationFromJSON(json: any): ClientInitialAccessCreatePresentation {
    return ClientInitialAccessCreatePresentationFromJSONTyped(json, false);
}

export function ClientInitialAccessCreatePresentationFromJSONTyped(json: any, ignoreDiscriminator: boolean): ClientInitialAccessCreatePresentation {
    if (json == null) {
        return json;
    }
    return {
        
        'expiration': json['expiration'] == null ? undefined : json['expiration'],
        'count': json['count'] == null ? undefined : json['count'],
    };
}

export function ClientInitialAccessCreatePresentationToJSON(value?: ClientInitialAccessCreatePresentation | null): any {
    if (value == null) {
        return value;
    }
    return {
        
        'expiration': value['expiration'],
        'count': value['count'],
    };
}
