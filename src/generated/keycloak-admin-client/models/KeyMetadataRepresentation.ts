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
import type { KeyUse } from './KeyUse';
import {
    KeyUseFromJSON,
    KeyUseFromJSONTyped,
    KeyUseToJSON,
} from './KeyUse';

/**
 * 
 * @export
 * @interface KeyMetadataRepresentation
 */
export interface KeyMetadataRepresentation {
    /**
     * 
     * @type {string}
     * @memberof KeyMetadataRepresentation
     */
    providerId?: string;
    /**
     * 
     * @type {number}
     * @memberof KeyMetadataRepresentation
     */
    providerPriority?: number;
    /**
     * 
     * @type {string}
     * @memberof KeyMetadataRepresentation
     */
    kid?: string;
    /**
     * 
     * @type {string}
     * @memberof KeyMetadataRepresentation
     */
    status?: string;
    /**
     * 
     * @type {string}
     * @memberof KeyMetadataRepresentation
     */
    type?: string;
    /**
     * 
     * @type {string}
     * @memberof KeyMetadataRepresentation
     */
    algorithm?: string;
    /**
     * 
     * @type {string}
     * @memberof KeyMetadataRepresentation
     */
    publicKey?: string;
    /**
     * 
     * @type {string}
     * @memberof KeyMetadataRepresentation
     */
    certificate?: string;
    /**
     * 
     * @type {KeyUse}
     * @memberof KeyMetadataRepresentation
     */
    use?: KeyUse;
    /**
     * 
     * @type {number}
     * @memberof KeyMetadataRepresentation
     */
    validTo?: number;
}

/**
 * Check if a given object implements the KeyMetadataRepresentation interface.
 */
export function instanceOfKeyMetadataRepresentation(value: object): boolean {
    return true;
}

export function KeyMetadataRepresentationFromJSON(json: any): KeyMetadataRepresentation {
    return KeyMetadataRepresentationFromJSONTyped(json, false);
}

export function KeyMetadataRepresentationFromJSONTyped(json: any, ignoreDiscriminator: boolean): KeyMetadataRepresentation {
    if (json == null) {
        return json;
    }
    return {
        
        'providerId': json['providerId'] == null ? undefined : json['providerId'],
        'providerPriority': json['providerPriority'] == null ? undefined : json['providerPriority'],
        'kid': json['kid'] == null ? undefined : json['kid'],
        'status': json['status'] == null ? undefined : json['status'],
        'type': json['type'] == null ? undefined : json['type'],
        'algorithm': json['algorithm'] == null ? undefined : json['algorithm'],
        'publicKey': json['publicKey'] == null ? undefined : json['publicKey'],
        'certificate': json['certificate'] == null ? undefined : json['certificate'],
        'use': json['use'] == null ? undefined : KeyUseFromJSON(json['use']),
        'validTo': json['validTo'] == null ? undefined : json['validTo'],
    };
}

export function KeyMetadataRepresentationToJSON(value?: KeyMetadataRepresentation | null): any {
    if (value == null) {
        return value;
    }
    return {
        
        'providerId': value['providerId'],
        'providerPriority': value['providerPriority'],
        'kid': value['kid'],
        'status': value['status'],
        'type': value['type'],
        'algorithm': value['algorithm'],
        'publicKey': value['publicKey'],
        'certificate': value['certificate'],
        'use': KeyUseToJSON(value['use']),
        'validTo': value['validTo'],
    };
}
