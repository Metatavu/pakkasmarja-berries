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
import type { ConfigPropertyRepresentation } from './ConfigPropertyRepresentation';
import {
    ConfigPropertyRepresentationFromJSON,
    ConfigPropertyRepresentationFromJSONTyped,
    ConfigPropertyRepresentationToJSON,
} from './ConfigPropertyRepresentation';

/**
 * 
 * @export
 * @interface IdentityProviderMapperTypeRepresentation
 */
export interface IdentityProviderMapperTypeRepresentation {
    /**
     * 
     * @type {string}
     * @memberof IdentityProviderMapperTypeRepresentation
     */
    id?: string;
    /**
     * 
     * @type {string}
     * @memberof IdentityProviderMapperTypeRepresentation
     */
    name?: string;
    /**
     * 
     * @type {string}
     * @memberof IdentityProviderMapperTypeRepresentation
     */
    category?: string;
    /**
     * 
     * @type {string}
     * @memberof IdentityProviderMapperTypeRepresentation
     */
    helpText?: string;
    /**
     * 
     * @type {Array<ConfigPropertyRepresentation>}
     * @memberof IdentityProviderMapperTypeRepresentation
     */
    properties?: Array<ConfigPropertyRepresentation>;
}

/**
 * Check if a given object implements the IdentityProviderMapperTypeRepresentation interface.
 */
export function instanceOfIdentityProviderMapperTypeRepresentation(value: object): boolean {
    return true;
}

export function IdentityProviderMapperTypeRepresentationFromJSON(json: any): IdentityProviderMapperTypeRepresentation {
    return IdentityProviderMapperTypeRepresentationFromJSONTyped(json, false);
}

export function IdentityProviderMapperTypeRepresentationFromJSONTyped(json: any, ignoreDiscriminator: boolean): IdentityProviderMapperTypeRepresentation {
    if (json == null) {
        return json;
    }
    return {
        
        'id': json['id'] == null ? undefined : json['id'],
        'name': json['name'] == null ? undefined : json['name'],
        'category': json['category'] == null ? undefined : json['category'],
        'helpText': json['helpText'] == null ? undefined : json['helpText'],
        'properties': json['properties'] == null ? undefined : ((json['properties'] as Array<any>).map(ConfigPropertyRepresentationFromJSON)),
    };
}

export function IdentityProviderMapperTypeRepresentationToJSON(value?: IdentityProviderMapperTypeRepresentation | null): any {
    if (value == null) {
        return value;
    }
    return {
        
        'id': value['id'],
        'name': value['name'],
        'category': value['category'],
        'helpText': value['helpText'],
        'properties': value['properties'] == null ? undefined : ((value['properties'] as Array<any>).map(ConfigPropertyRepresentationToJSON)),
    };
}

