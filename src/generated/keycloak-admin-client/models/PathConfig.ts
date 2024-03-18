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
import type { EnforcementMode } from './EnforcementMode';
import {
    EnforcementModeFromJSON,
    EnforcementModeFromJSONTyped,
    EnforcementModeToJSON,
} from './EnforcementMode';
import type { MethodConfig } from './MethodConfig';
import {
    MethodConfigFromJSON,
    MethodConfigFromJSONTyped,
    MethodConfigToJSON,
} from './MethodConfig';

/**
 * 
 * @export
 * @interface PathConfig
 */
export interface PathConfig {
    /**
     * 
     * @type {string}
     * @memberof PathConfig
     */
    name?: string;
    /**
     * 
     * @type {string}
     * @memberof PathConfig
     */
    type?: string;
    /**
     * 
     * @type {string}
     * @memberof PathConfig
     */
    path?: string;
    /**
     * 
     * @type {Array<MethodConfig>}
     * @memberof PathConfig
     */
    methods?: Array<MethodConfig>;
    /**
     * 
     * @type {Array<string>}
     * @memberof PathConfig
     */
    scopes?: Array<string>;
    /**
     * 
     * @type {string}
     * @memberof PathConfig
     */
    id?: string;
    /**
     * 
     * @type {EnforcementMode}
     * @memberof PathConfig
     */
    enforcementMode?: EnforcementMode;
    /**
     * 
     * @type {{ [key: string]: { [key: string]: any; }; }}
     * @memberof PathConfig
     */
    claimInformationPoint?: { [key: string]: { [key: string]: any; }; };
    /**
     * 
     * @type {boolean}
     * @memberof PathConfig
     */
    invalidated?: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof PathConfig
     */
    staticPath?: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof PathConfig
     */
    _static?: boolean;
}

/**
 * Check if a given object implements the PathConfig interface.
 */
export function instanceOfPathConfig(value: object): boolean {
    return true;
}

export function PathConfigFromJSON(json: any): PathConfig {
    return PathConfigFromJSONTyped(json, false);
}

export function PathConfigFromJSONTyped(json: any, ignoreDiscriminator: boolean): PathConfig {
    if (json == null) {
        return json;
    }
    return {
        
        'name': json['name'] == null ? undefined : json['name'],
        'type': json['type'] == null ? undefined : json['type'],
        'path': json['path'] == null ? undefined : json['path'],
        'methods': json['methods'] == null ? undefined : ((json['methods'] as Array<any>).map(MethodConfigFromJSON)),
        'scopes': json['scopes'] == null ? undefined : json['scopes'],
        'id': json['id'] == null ? undefined : json['id'],
        'enforcementMode': json['enforcement-mode'] == null ? undefined : EnforcementModeFromJSON(json['enforcement-mode']),
        'claimInformationPoint': json['claim-information-point'] == null ? undefined : json['claim-information-point'],
        'invalidated': json['invalidated'] == null ? undefined : json['invalidated'],
        'staticPath': json['staticPath'] == null ? undefined : json['staticPath'],
        '_static': json['static'] == null ? undefined : json['static'],
    };
}

export function PathConfigToJSON(value?: PathConfig | null): any {
    if (value == null) {
        return value;
    }
    return {
        
        'name': value['name'],
        'type': value['type'],
        'path': value['path'],
        'methods': value['methods'] == null ? undefined : ((value['methods'] as Array<any>).map(MethodConfigToJSON)),
        'scopes': value['scopes'],
        'id': value['id'],
        'enforcement-mode': EnforcementModeToJSON(value['enforcementMode']),
        'claim-information-point': value['claimInformationPoint'],
        'invalidated': value['invalidated'],
        'staticPath': value['staticPath'],
        'static': value['_static'],
    };
}

