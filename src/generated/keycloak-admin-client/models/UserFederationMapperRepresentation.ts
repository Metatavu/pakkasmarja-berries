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
 * @interface UserFederationMapperRepresentation
 */
export interface UserFederationMapperRepresentation {
    /**
     * 
     * @type {string}
     * @memberof UserFederationMapperRepresentation
     */
    id?: string;
    /**
     * 
     * @type {string}
     * @memberof UserFederationMapperRepresentation
     */
    name?: string;
    /**
     * 
     * @type {string}
     * @memberof UserFederationMapperRepresentation
     */
    federationProviderDisplayName?: string;
    /**
     * 
     * @type {string}
     * @memberof UserFederationMapperRepresentation
     */
    federationMapperType?: string;
    /**
     * 
     * @type {{ [key: string]: string; }}
     * @memberof UserFederationMapperRepresentation
     */
    config?: { [key: string]: string; };
}

/**
 * Check if a given object implements the UserFederationMapperRepresentation interface.
 */
export function instanceOfUserFederationMapperRepresentation(value: object): boolean {
    return true;
}

export function UserFederationMapperRepresentationFromJSON(json: any): UserFederationMapperRepresentation {
    return UserFederationMapperRepresentationFromJSONTyped(json, false);
}

export function UserFederationMapperRepresentationFromJSONTyped(json: any, ignoreDiscriminator: boolean): UserFederationMapperRepresentation {
    if (json == null) {
        return json;
    }
    return {
        
        'id': json['id'] == null ? undefined : json['id'],
        'name': json['name'] == null ? undefined : json['name'],
        'federationProviderDisplayName': json['federationProviderDisplayName'] == null ? undefined : json['federationProviderDisplayName'],
        'federationMapperType': json['federationMapperType'] == null ? undefined : json['federationMapperType'],
        'config': json['config'] == null ? undefined : json['config'],
    };
}

export function UserFederationMapperRepresentationToJSON(value?: UserFederationMapperRepresentation | null): any {
    if (value == null) {
        return value;
    }
    return {
        
        'id': value['id'],
        'name': value['name'],
        'federationProviderDisplayName': value['federationProviderDisplayName'],
        'federationMapperType': value['federationMapperType'],
        'config': value['config'],
    };
}

