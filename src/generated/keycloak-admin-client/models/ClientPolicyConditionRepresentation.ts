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
 * @interface ClientPolicyConditionRepresentation
 */
export interface ClientPolicyConditionRepresentation {
    /**
     * 
     * @type {string}
     * @memberof ClientPolicyConditionRepresentation
     */
    condition?: string;
    /**
     * 
     * @type {Array<object>}
     * @memberof ClientPolicyConditionRepresentation
     */
    _configuration?: Array<object>;
}

/**
 * Check if a given object implements the ClientPolicyConditionRepresentation interface.
 */
export function instanceOfClientPolicyConditionRepresentation(value: object): boolean {
    return true;
}

export function ClientPolicyConditionRepresentationFromJSON(json: any): ClientPolicyConditionRepresentation {
    return ClientPolicyConditionRepresentationFromJSONTyped(json, false);
}

export function ClientPolicyConditionRepresentationFromJSONTyped(json: any, ignoreDiscriminator: boolean): ClientPolicyConditionRepresentation {
    if (json == null) {
        return json;
    }
    return {
        
        'condition': json['condition'] == null ? undefined : json['condition'],
        '_configuration': json['configuration'] == null ? undefined : json['configuration'],
    };
}

export function ClientPolicyConditionRepresentationToJSON(value?: ClientPolicyConditionRepresentation | null): any {
    if (value == null) {
        return value;
    }
    return {
        
        'condition': value['condition'],
        'configuration': value['_configuration'],
    };
}

