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
 * @interface CredentialRepresentation
 */
export interface CredentialRepresentation {
    /**
     * 
     * @type {string}
     * @memberof CredentialRepresentation
     */
    id?: string;
    /**
     * 
     * @type {string}
     * @memberof CredentialRepresentation
     */
    type?: string;
    /**
     * 
     * @type {string}
     * @memberof CredentialRepresentation
     */
    userLabel?: string;
    /**
     * 
     * @type {number}
     * @memberof CredentialRepresentation
     */
    createdDate?: number;
    /**
     * 
     * @type {string}
     * @memberof CredentialRepresentation
     */
    secretData?: string;
    /**
     * 
     * @type {string}
     * @memberof CredentialRepresentation
     */
    credentialData?: string;
    /**
     * 
     * @type {number}
     * @memberof CredentialRepresentation
     */
    priority?: number;
    /**
     * 
     * @type {string}
     * @memberof CredentialRepresentation
     */
    value?: string;
    /**
     * 
     * @type {boolean}
     * @memberof CredentialRepresentation
     */
    temporary?: boolean;
    /**
     * 
     * @type {string}
     * @memberof CredentialRepresentation
     * @deprecated
     */
    device?: string;
    /**
     * 
     * @type {string}
     * @memberof CredentialRepresentation
     * @deprecated
     */
    hashedSaltedValue?: string;
    /**
     * 
     * @type {string}
     * @memberof CredentialRepresentation
     * @deprecated
     */
    salt?: string;
    /**
     * 
     * @type {number}
     * @memberof CredentialRepresentation
     * @deprecated
     */
    hashIterations?: number;
    /**
     * 
     * @type {number}
     * @memberof CredentialRepresentation
     * @deprecated
     */
    counter?: number;
    /**
     * 
     * @type {string}
     * @memberof CredentialRepresentation
     * @deprecated
     */
    algorithm?: string;
    /**
     * 
     * @type {number}
     * @memberof CredentialRepresentation
     * @deprecated
     */
    digits?: number;
    /**
     * 
     * @type {number}
     * @memberof CredentialRepresentation
     * @deprecated
     */
    period?: number;
    /**
     * 
     * @type {{ [key: string]: Array<string>; }}
     * @memberof CredentialRepresentation
     */
    config?: { [key: string]: Array<string>; };
}

/**
 * Check if a given object implements the CredentialRepresentation interface.
 */
export function instanceOfCredentialRepresentation(value: object): boolean {
    return true;
}

export function CredentialRepresentationFromJSON(json: any): CredentialRepresentation {
    return CredentialRepresentationFromJSONTyped(json, false);
}

export function CredentialRepresentationFromJSONTyped(json: any, ignoreDiscriminator: boolean): CredentialRepresentation {
    if (json == null) {
        return json;
    }
    return {
        
        'id': json['id'] == null ? undefined : json['id'],
        'type': json['type'] == null ? undefined : json['type'],
        'userLabel': json['userLabel'] == null ? undefined : json['userLabel'],
        'createdDate': json['createdDate'] == null ? undefined : json['createdDate'],
        'secretData': json['secretData'] == null ? undefined : json['secretData'],
        'credentialData': json['credentialData'] == null ? undefined : json['credentialData'],
        'priority': json['priority'] == null ? undefined : json['priority'],
        'value': json['value'] == null ? undefined : json['value'],
        'temporary': json['temporary'] == null ? undefined : json['temporary'],
        'device': json['device'] == null ? undefined : json['device'],
        'hashedSaltedValue': json['hashedSaltedValue'] == null ? undefined : json['hashedSaltedValue'],
        'salt': json['salt'] == null ? undefined : json['salt'],
        'hashIterations': json['hashIterations'] == null ? undefined : json['hashIterations'],
        'counter': json['counter'] == null ? undefined : json['counter'],
        'algorithm': json['algorithm'] == null ? undefined : json['algorithm'],
        'digits': json['digits'] == null ? undefined : json['digits'],
        'period': json['period'] == null ? undefined : json['period'],
        'config': json['config'] == null ? undefined : json['config'],
    };
}

export function CredentialRepresentationToJSON(value?: CredentialRepresentation | null): any {
    if (value == null) {
        return value;
    }
    return {
        
        'id': value['id'],
        'type': value['type'],
        'userLabel': value['userLabel'],
        'createdDate': value['createdDate'],
        'secretData': value['secretData'],
        'credentialData': value['credentialData'],
        'priority': value['priority'],
        'value': value['value'],
        'temporary': value['temporary'],
        'device': value['device'],
        'hashedSaltedValue': value['hashedSaltedValue'],
        'salt': value['salt'],
        'hashIterations': value['hashIterations'],
        'counter': value['counter'],
        'algorithm': value['algorithm'],
        'digits': value['digits'],
        'period': value['period'],
        'config': value['config'],
    };
}

