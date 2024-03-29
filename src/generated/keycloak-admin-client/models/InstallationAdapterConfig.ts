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
import type { PolicyEnforcerConfig } from './PolicyEnforcerConfig';
import {
    PolicyEnforcerConfigFromJSON,
    PolicyEnforcerConfigFromJSONTyped,
    PolicyEnforcerConfigToJSON,
} from './PolicyEnforcerConfig';

/**
 * 
 * @export
 * @interface InstallationAdapterConfig
 */
export interface InstallationAdapterConfig {
    /**
     * 
     * @type {string}
     * @memberof InstallationAdapterConfig
     */
    realm?: string;
    /**
     * 
     * @type {string}
     * @memberof InstallationAdapterConfig
     */
    realmPublicKey?: string;
    /**
     * 
     * @type {string}
     * @memberof InstallationAdapterConfig
     */
    authServerUrl?: string;
    /**
     * 
     * @type {string}
     * @memberof InstallationAdapterConfig
     */
    sslRequired?: string;
    /**
     * 
     * @type {boolean}
     * @memberof InstallationAdapterConfig
     */
    bearerOnly?: boolean;
    /**
     * 
     * @type {string}
     * @memberof InstallationAdapterConfig
     */
    resource?: string;
    /**
     * 
     * @type {boolean}
     * @memberof InstallationAdapterConfig
     */
    publicClient?: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof InstallationAdapterConfig
     */
    verifyTokenAudience?: boolean;
    /**
     * 
     * @type {{ [key: string]: any; }}
     * @memberof InstallationAdapterConfig
     */
    credentials?: { [key: string]: any; };
    /**
     * 
     * @type {boolean}
     * @memberof InstallationAdapterConfig
     */
    useResourceRoleMappings?: boolean;
    /**
     * 
     * @type {number}
     * @memberof InstallationAdapterConfig
     */
    confidentialPort?: number;
    /**
     * 
     * @type {PolicyEnforcerConfig}
     * @memberof InstallationAdapterConfig
     */
    policyEnforcer?: PolicyEnforcerConfig;
}

/**
 * Check if a given object implements the InstallationAdapterConfig interface.
 */
export function instanceOfInstallationAdapterConfig(value: object): boolean {
    return true;
}

export function InstallationAdapterConfigFromJSON(json: any): InstallationAdapterConfig {
    return InstallationAdapterConfigFromJSONTyped(json, false);
}

export function InstallationAdapterConfigFromJSONTyped(json: any, ignoreDiscriminator: boolean): InstallationAdapterConfig {
    if (json == null) {
        return json;
    }
    return {
        
        'realm': json['realm'] == null ? undefined : json['realm'],
        'realmPublicKey': json['realm-public-key'] == null ? undefined : json['realm-public-key'],
        'authServerUrl': json['auth-server-url'] == null ? undefined : json['auth-server-url'],
        'sslRequired': json['ssl-required'] == null ? undefined : json['ssl-required'],
        'bearerOnly': json['bearer-only'] == null ? undefined : json['bearer-only'],
        'resource': json['resource'] == null ? undefined : json['resource'],
        'publicClient': json['public-client'] == null ? undefined : json['public-client'],
        'verifyTokenAudience': json['verify-token-audience'] == null ? undefined : json['verify-token-audience'],
        'credentials': json['credentials'] == null ? undefined : json['credentials'],
        'useResourceRoleMappings': json['use-resource-role-mappings'] == null ? undefined : json['use-resource-role-mappings'],
        'confidentialPort': json['confidential-port'] == null ? undefined : json['confidential-port'],
        'policyEnforcer': json['policy-enforcer'] == null ? undefined : PolicyEnforcerConfigFromJSON(json['policy-enforcer']),
    };
}

export function InstallationAdapterConfigToJSON(value?: InstallationAdapterConfig | null): any {
    if (value == null) {
        return value;
    }
    return {
        
        'realm': value['realm'],
        'realm-public-key': value['realmPublicKey'],
        'auth-server-url': value['authServerUrl'],
        'ssl-required': value['sslRequired'],
        'bearer-only': value['bearerOnly'],
        'resource': value['resource'],
        'public-client': value['publicClient'],
        'verify-token-audience': value['verifyTokenAudience'],
        'credentials': value['credentials'],
        'use-resource-role-mappings': value['useResourceRoleMappings'],
        'confidential-port': value['confidentialPort'],
        'policy-enforcer': PolicyEnforcerConfigToJSON(value['policyEnforcer']),
    };
}

