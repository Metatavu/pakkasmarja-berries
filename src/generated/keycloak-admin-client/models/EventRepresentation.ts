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
 * @interface EventRepresentation
 */
export interface EventRepresentation {
    /**
     * 
     * @type {number}
     * @memberof EventRepresentation
     */
    time?: number;
    /**
     * 
     * @type {string}
     * @memberof EventRepresentation
     */
    type?: string;
    /**
     * 
     * @type {string}
     * @memberof EventRepresentation
     */
    realmId?: string;
    /**
     * 
     * @type {string}
     * @memberof EventRepresentation
     */
    clientId?: string;
    /**
     * 
     * @type {string}
     * @memberof EventRepresentation
     */
    userId?: string;
    /**
     * 
     * @type {string}
     * @memberof EventRepresentation
     */
    sessionId?: string;
    /**
     * 
     * @type {string}
     * @memberof EventRepresentation
     */
    ipAddress?: string;
    /**
     * 
     * @type {string}
     * @memberof EventRepresentation
     */
    error?: string;
    /**
     * 
     * @type {{ [key: string]: string; }}
     * @memberof EventRepresentation
     */
    details?: { [key: string]: string; };
}

/**
 * Check if a given object implements the EventRepresentation interface.
 */
export function instanceOfEventRepresentation(value: object): boolean {
    return true;
}

export function EventRepresentationFromJSON(json: any): EventRepresentation {
    return EventRepresentationFromJSONTyped(json, false);
}

export function EventRepresentationFromJSONTyped(json: any, ignoreDiscriminator: boolean): EventRepresentation {
    if (json == null) {
        return json;
    }
    return {
        
        'time': json['time'] == null ? undefined : json['time'],
        'type': json['type'] == null ? undefined : json['type'],
        'realmId': json['realmId'] == null ? undefined : json['realmId'],
        'clientId': json['clientId'] == null ? undefined : json['clientId'],
        'userId': json['userId'] == null ? undefined : json['userId'],
        'sessionId': json['sessionId'] == null ? undefined : json['sessionId'],
        'ipAddress': json['ipAddress'] == null ? undefined : json['ipAddress'],
        'error': json['error'] == null ? undefined : json['error'],
        'details': json['details'] == null ? undefined : json['details'],
    };
}

export function EventRepresentationToJSON(value?: EventRepresentation | null): any {
    if (value == null) {
        return value;
    }
    return {
        
        'time': value['time'],
        'type': value['type'],
        'realmId': value['realmId'],
        'clientId': value['clientId'],
        'userId': value['userId'],
        'sessionId': value['sessionId'],
        'ipAddress': value['ipAddress'],
        'error': value['error'],
        'details': value['details'],
    };
}

