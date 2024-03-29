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
import type { UPAttributePermissions } from './UPAttributePermissions';
import {
    UPAttributePermissionsFromJSON,
    UPAttributePermissionsFromJSONTyped,
    UPAttributePermissionsToJSON,
} from './UPAttributePermissions';
import type { UPAttributeRequired } from './UPAttributeRequired';
import {
    UPAttributeRequiredFromJSON,
    UPAttributeRequiredFromJSONTyped,
    UPAttributeRequiredToJSON,
} from './UPAttributeRequired';
import type { UPAttributeSelector } from './UPAttributeSelector';
import {
    UPAttributeSelectorFromJSON,
    UPAttributeSelectorFromJSONTyped,
    UPAttributeSelectorToJSON,
} from './UPAttributeSelector';

/**
 * 
 * @export
 * @interface UPAttribute
 */
export interface UPAttribute {
    /**
     * 
     * @type {string}
     * @memberof UPAttribute
     */
    name?: string;
    /**
     * 
     * @type {string}
     * @memberof UPAttribute
     */
    displayName?: string;
    /**
     * 
     * @type {{ [key: string]: { [key: string]: any; }; }}
     * @memberof UPAttribute
     */
    validations?: { [key: string]: { [key: string]: any; }; };
    /**
     * 
     * @type {{ [key: string]: any; }}
     * @memberof UPAttribute
     */
    annotations?: { [key: string]: any; };
    /**
     * 
     * @type {UPAttributeRequired}
     * @memberof UPAttribute
     */
    required?: UPAttributeRequired;
    /**
     * 
     * @type {UPAttributePermissions}
     * @memberof UPAttribute
     */
    permissions?: UPAttributePermissions;
    /**
     * 
     * @type {UPAttributeSelector}
     * @memberof UPAttribute
     */
    selector?: UPAttributeSelector;
    /**
     * 
     * @type {string}
     * @memberof UPAttribute
     */
    group?: string;
    /**
     * 
     * @type {boolean}
     * @memberof UPAttribute
     */
    multivalued?: boolean;
}

/**
 * Check if a given object implements the UPAttribute interface.
 */
export function instanceOfUPAttribute(value: object): boolean {
    return true;
}

export function UPAttributeFromJSON(json: any): UPAttribute {
    return UPAttributeFromJSONTyped(json, false);
}

export function UPAttributeFromJSONTyped(json: any, ignoreDiscriminator: boolean): UPAttribute {
    if (json == null) {
        return json;
    }
    return {
        
        'name': json['name'] == null ? undefined : json['name'],
        'displayName': json['displayName'] == null ? undefined : json['displayName'],
        'validations': json['validations'] == null ? undefined : json['validations'],
        'annotations': json['annotations'] == null ? undefined : json['annotations'],
        'required': json['required'] == null ? undefined : UPAttributeRequiredFromJSON(json['required']),
        'permissions': json['permissions'] == null ? undefined : UPAttributePermissionsFromJSON(json['permissions']),
        'selector': json['selector'] == null ? undefined : UPAttributeSelectorFromJSON(json['selector']),
        'group': json['group'] == null ? undefined : json['group'],
        'multivalued': json['multivalued'] == null ? undefined : json['multivalued'],
    };
}

export function UPAttributeToJSON(value?: UPAttribute | null): any {
    if (value == null) {
        return value;
    }
    return {
        
        'name': value['name'],
        'displayName': value['displayName'],
        'validations': value['validations'],
        'annotations': value['annotations'],
        'required': UPAttributeRequiredToJSON(value['required']),
        'permissions': UPAttributePermissionsToJSON(value['permissions']),
        'selector': UPAttributeSelectorToJSON(value['selector']),
        'group': value['group'],
        'multivalued': value['multivalued'],
    };
}

