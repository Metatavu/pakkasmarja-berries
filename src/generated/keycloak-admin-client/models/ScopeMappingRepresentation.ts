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
 * @interface ScopeMappingRepresentation
 */
export interface ScopeMappingRepresentation {
    /**
     * 
     * @type {string}
     * @memberof ScopeMappingRepresentation
     */
    self?: string;
    /**
     * 
     * @type {string}
     * @memberof ScopeMappingRepresentation
     */
    client?: string;
    /**
     * 
     * @type {string}
     * @memberof ScopeMappingRepresentation
     * @deprecated
     */
    clientTemplate?: string;
    /**
     * 
     * @type {string}
     * @memberof ScopeMappingRepresentation
     */
    clientScope?: string;
    /**
     * 
     * @type {Set<string>}
     * @memberof ScopeMappingRepresentation
     */
    roles?: Set<string>;
}

/**
 * Check if a given object implements the ScopeMappingRepresentation interface.
 */
export function instanceOfScopeMappingRepresentation(value: object): boolean {
    return true;
}

export function ScopeMappingRepresentationFromJSON(json: any): ScopeMappingRepresentation {
    return ScopeMappingRepresentationFromJSONTyped(json, false);
}

export function ScopeMappingRepresentationFromJSONTyped(json: any, ignoreDiscriminator: boolean): ScopeMappingRepresentation {
    if (json == null) {
        return json;
    }
    return {
        
        'self': json['self'] == null ? undefined : json['self'],
        'client': json['client'] == null ? undefined : json['client'],
        'clientTemplate': json['clientTemplate'] == null ? undefined : json['clientTemplate'],
        'clientScope': json['clientScope'] == null ? undefined : json['clientScope'],
        'roles': json['roles'] == null ? undefined : json['roles'],
    };
}

export function ScopeMappingRepresentationToJSON(value?: ScopeMappingRepresentation | null): any {
    if (value == null) {
        return value;
    }
    return {
        
        'self': value['self'],
        'client': value['client'],
        'clientTemplate': value['clientTemplate'],
        'clientScope': value['clientScope'],
        'roles': value['roles'] == null ? undefined : Array.from(value['roles'] as Set<any>),
    };
}

