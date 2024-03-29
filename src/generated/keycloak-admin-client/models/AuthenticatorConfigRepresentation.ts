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
 * @interface AuthenticatorConfigRepresentation
 */
export interface AuthenticatorConfigRepresentation {
    /**
     * 
     * @type {string}
     * @memberof AuthenticatorConfigRepresentation
     */
    id?: string;
    /**
     * 
     * @type {string}
     * @memberof AuthenticatorConfigRepresentation
     */
    alias?: string;
    /**
     * 
     * @type {{ [key: string]: string; }}
     * @memberof AuthenticatorConfigRepresentation
     */
    config?: { [key: string]: string; };
}

/**
 * Check if a given object implements the AuthenticatorConfigRepresentation interface.
 */
export function instanceOfAuthenticatorConfigRepresentation(value: object): boolean {
    return true;
}

export function AuthenticatorConfigRepresentationFromJSON(json: any): AuthenticatorConfigRepresentation {
    return AuthenticatorConfigRepresentationFromJSONTyped(json, false);
}

export function AuthenticatorConfigRepresentationFromJSONTyped(json: any, ignoreDiscriminator: boolean): AuthenticatorConfigRepresentation {
    if (json == null) {
        return json;
    }
    return {
        
        'id': json['id'] == null ? undefined : json['id'],
        'alias': json['alias'] == null ? undefined : json['alias'],
        'config': json['config'] == null ? undefined : json['config'],
    };
}

export function AuthenticatorConfigRepresentationToJSON(value?: AuthenticatorConfigRepresentation | null): any {
    if (value == null) {
        return value;
    }
    return {
        
        'id': value['id'],
        'alias': value['alias'],
        'config': value['config'],
    };
}

