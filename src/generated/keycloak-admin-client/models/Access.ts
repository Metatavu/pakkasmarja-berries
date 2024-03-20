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
 * @interface Access
 */
export interface Access {
    /**
     * 
     * @type {Set<string>}
     * @memberof Access
     */
    roles?: Set<string>;
    /**
     * 
     * @type {boolean}
     * @memberof Access
     */
    verifyCaller?: boolean;
}

/**
 * Check if a given object implements the Access interface.
 */
export function instanceOfAccess(value: object): boolean {
    return true;
}

export function AccessFromJSON(json: any): Access {
    return AccessFromJSONTyped(json, false);
}

export function AccessFromJSONTyped(json: any, ignoreDiscriminator: boolean): Access {
    if (json == null) {
        return json;
    }
    return {
        
        'roles': json['roles'] == null ? undefined : json['roles'],
        'verifyCaller': json['verify_caller'] == null ? undefined : json['verify_caller'],
    };
}

export function AccessToJSON(value?: Access | null): any {
    if (value == null) {
        return value;
    }
    return {
        
        'roles': value['roles'] == null ? undefined : Array.from(value['roles'] as Set<any>),
        'verify_caller': value['verifyCaller'],
    };
}

