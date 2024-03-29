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
 * @interface UserProfileAttributeGroupMetadata
 */
export interface UserProfileAttributeGroupMetadata {
    /**
     * 
     * @type {string}
     * @memberof UserProfileAttributeGroupMetadata
     */
    name?: string;
    /**
     * 
     * @type {string}
     * @memberof UserProfileAttributeGroupMetadata
     */
    displayHeader?: string;
    /**
     * 
     * @type {string}
     * @memberof UserProfileAttributeGroupMetadata
     */
    displayDescription?: string;
    /**
     * 
     * @type {{ [key: string]: any; }}
     * @memberof UserProfileAttributeGroupMetadata
     */
    annotations?: { [key: string]: any; };
}

/**
 * Check if a given object implements the UserProfileAttributeGroupMetadata interface.
 */
export function instanceOfUserProfileAttributeGroupMetadata(value: object): boolean {
    return true;
}

export function UserProfileAttributeGroupMetadataFromJSON(json: any): UserProfileAttributeGroupMetadata {
    return UserProfileAttributeGroupMetadataFromJSONTyped(json, false);
}

export function UserProfileAttributeGroupMetadataFromJSONTyped(json: any, ignoreDiscriminator: boolean): UserProfileAttributeGroupMetadata {
    if (json == null) {
        return json;
    }
    return {
        
        'name': json['name'] == null ? undefined : json['name'],
        'displayHeader': json['displayHeader'] == null ? undefined : json['displayHeader'],
        'displayDescription': json['displayDescription'] == null ? undefined : json['displayDescription'],
        'annotations': json['annotations'] == null ? undefined : json['annotations'],
    };
}

export function UserProfileAttributeGroupMetadataToJSON(value?: UserProfileAttributeGroupMetadata | null): any {
    if (value == null) {
        return value;
    }
    return {
        
        'name': value['name'],
        'displayHeader': value['displayHeader'],
        'displayDescription': value['displayDescription'],
        'annotations': value['annotations'],
    };
}

