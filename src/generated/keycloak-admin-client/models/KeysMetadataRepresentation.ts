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
import type { KeyMetadataRepresentation } from './KeyMetadataRepresentation';
import {
    KeyMetadataRepresentationFromJSON,
    KeyMetadataRepresentationFromJSONTyped,
    KeyMetadataRepresentationToJSON,
} from './KeyMetadataRepresentation';

/**
 * 
 * @export
 * @interface KeysMetadataRepresentation
 */
export interface KeysMetadataRepresentation {
    /**
     * 
     * @type {{ [key: string]: string; }}
     * @memberof KeysMetadataRepresentation
     */
    active?: { [key: string]: string; };
    /**
     * 
     * @type {Array<KeyMetadataRepresentation>}
     * @memberof KeysMetadataRepresentation
     */
    keys?: Array<KeyMetadataRepresentation>;
}

/**
 * Check if a given object implements the KeysMetadataRepresentation interface.
 */
export function instanceOfKeysMetadataRepresentation(value: object): boolean {
    return true;
}

export function KeysMetadataRepresentationFromJSON(json: any): KeysMetadataRepresentation {
    return KeysMetadataRepresentationFromJSONTyped(json, false);
}

export function KeysMetadataRepresentationFromJSONTyped(json: any, ignoreDiscriminator: boolean): KeysMetadataRepresentation {
    if (json == null) {
        return json;
    }
    return {
        
        'active': json['active'] == null ? undefined : json['active'],
        'keys': json['keys'] == null ? undefined : ((json['keys'] as Array<any>).map(KeyMetadataRepresentationFromJSON)),
    };
}

export function KeysMetadataRepresentationToJSON(value?: KeysMetadataRepresentation | null): any {
    if (value == null) {
        return value;
    }
    return {
        
        'active': value['active'],
        'keys': value['keys'] == null ? undefined : ((value['keys'] as Array<any>).map(KeyMetadataRepresentationToJSON)),
    };
}
