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
 * @interface ProtocolMapperRepresentation
 */
export interface ProtocolMapperRepresentation {
    /**
     * 
     * @type {string}
     * @memberof ProtocolMapperRepresentation
     */
    id?: string;
    /**
     * 
     * @type {string}
     * @memberof ProtocolMapperRepresentation
     */
    name?: string;
    /**
     * 
     * @type {string}
     * @memberof ProtocolMapperRepresentation
     */
    protocol?: string;
    /**
     * 
     * @type {string}
     * @memberof ProtocolMapperRepresentation
     */
    protocolMapper?: string;
    /**
     * 
     * @type {boolean}
     * @memberof ProtocolMapperRepresentation
     * @deprecated
     */
    consentRequired?: boolean;
    /**
     * 
     * @type {string}
     * @memberof ProtocolMapperRepresentation
     * @deprecated
     */
    consentText?: string;
    /**
     * 
     * @type {{ [key: string]: string; }}
     * @memberof ProtocolMapperRepresentation
     */
    config?: { [key: string]: string; };
}

/**
 * Check if a given object implements the ProtocolMapperRepresentation interface.
 */
export function instanceOfProtocolMapperRepresentation(value: object): boolean {
    return true;
}

export function ProtocolMapperRepresentationFromJSON(json: any): ProtocolMapperRepresentation {
    return ProtocolMapperRepresentationFromJSONTyped(json, false);
}

export function ProtocolMapperRepresentationFromJSONTyped(json: any, ignoreDiscriminator: boolean): ProtocolMapperRepresentation {
    if (json == null) {
        return json;
    }
    return {
        
        'id': json['id'] == null ? undefined : json['id'],
        'name': json['name'] == null ? undefined : json['name'],
        'protocol': json['protocol'] == null ? undefined : json['protocol'],
        'protocolMapper': json['protocolMapper'] == null ? undefined : json['protocolMapper'],
        'consentRequired': json['consentRequired'] == null ? undefined : json['consentRequired'],
        'consentText': json['consentText'] == null ? undefined : json['consentText'],
        'config': json['config'] == null ? undefined : json['config'],
    };
}

export function ProtocolMapperRepresentationToJSON(value?: ProtocolMapperRepresentation | null): any {
    if (value == null) {
        return value;
    }
    return {
        
        'id': value['id'],
        'name': value['name'],
        'protocol': value['protocol'],
        'protocolMapper': value['protocolMapper'],
        'consentRequired': value['consentRequired'],
        'consentText': value['consentText'],
        'config': value['config'],
    };
}
