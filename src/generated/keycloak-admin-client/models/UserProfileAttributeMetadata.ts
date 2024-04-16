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
 * @interface UserProfileAttributeMetadata
 */
export interface UserProfileAttributeMetadata {
    /**
     * 
     * @type {string}
     * @memberof UserProfileAttributeMetadata
     */
    name?: string;
    /**
     * 
     * @type {string}
     * @memberof UserProfileAttributeMetadata
     */
    displayName?: string;
    /**
     * 
     * @type {boolean}
     * @memberof UserProfileAttributeMetadata
     */
    required?: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof UserProfileAttributeMetadata
     */
    readOnly?: boolean;
    /**
     * 
     * @type {{ [key: string]: any; }}
     * @memberof UserProfileAttributeMetadata
     */
    annotations?: { [key: string]: any; };
    /**
     * 
     * @type {{ [key: string]: { [key: string]: any; }; }}
     * @memberof UserProfileAttributeMetadata
     */
    validators?: { [key: string]: { [key: string]: any; }; };
    /**
     * 
     * @type {string}
     * @memberof UserProfileAttributeMetadata
     */
    group?: string;
    /**
     * 
     * @type {boolean}
     * @memberof UserProfileAttributeMetadata
     */
    multivalued?: boolean;
}

/**
 * Check if a given object implements the UserProfileAttributeMetadata interface.
 */
export function instanceOfUserProfileAttributeMetadata(value: object): boolean {
    return true;
}

export function UserProfileAttributeMetadataFromJSON(json: any): UserProfileAttributeMetadata {
    return UserProfileAttributeMetadataFromJSONTyped(json, false);
}

export function UserProfileAttributeMetadataFromJSONTyped(json: any, ignoreDiscriminator: boolean): UserProfileAttributeMetadata {
    if (json == null) {
        return json;
    }
    return {
        
        'name': json['name'] == null ? undefined : json['name'],
        'displayName': json['displayName'] == null ? undefined : json['displayName'],
        'required': json['required'] == null ? undefined : json['required'],
        'readOnly': json['readOnly'] == null ? undefined : json['readOnly'],
        'annotations': json['annotations'] == null ? undefined : json['annotations'],
        'validators': json['validators'] == null ? undefined : json['validators'],
        'group': json['group'] == null ? undefined : json['group'],
        'multivalued': json['multivalued'] == null ? undefined : json['multivalued'],
    };
}

export function UserProfileAttributeMetadataToJSON(value?: UserProfileAttributeMetadata | null): any {
    if (value == null) {
        return value;
    }
    return {
        
        'name': value['name'],
        'displayName': value['displayName'],
        'required': value['required'],
        'readOnly': value['readOnly'],
        'annotations': value['annotations'],
        'validators': value['validators'],
        'group': value['group'],
        'multivalued': value['multivalued'],
    };
}

