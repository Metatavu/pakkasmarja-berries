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
 * @interface AddressClaimSet
 */
export interface AddressClaimSet {
    /**
     * 
     * @type {string}
     * @memberof AddressClaimSet
     */
    formatted?: string;
    /**
     * 
     * @type {string}
     * @memberof AddressClaimSet
     */
    streetAddress?: string;
    /**
     * 
     * @type {string}
     * @memberof AddressClaimSet
     */
    locality?: string;
    /**
     * 
     * @type {string}
     * @memberof AddressClaimSet
     */
    region?: string;
    /**
     * 
     * @type {string}
     * @memberof AddressClaimSet
     */
    postalCode?: string;
    /**
     * 
     * @type {string}
     * @memberof AddressClaimSet
     */
    country?: string;
}

/**
 * Check if a given object implements the AddressClaimSet interface.
 */
export function instanceOfAddressClaimSet(value: object): boolean {
    return true;
}

export function AddressClaimSetFromJSON(json: any): AddressClaimSet {
    return AddressClaimSetFromJSONTyped(json, false);
}

export function AddressClaimSetFromJSONTyped(json: any, ignoreDiscriminator: boolean): AddressClaimSet {
    if (json == null) {
        return json;
    }
    return {
        
        'formatted': json['formatted'] == null ? undefined : json['formatted'],
        'streetAddress': json['street_address'] == null ? undefined : json['street_address'],
        'locality': json['locality'] == null ? undefined : json['locality'],
        'region': json['region'] == null ? undefined : json['region'],
        'postalCode': json['postal_code'] == null ? undefined : json['postal_code'],
        'country': json['country'] == null ? undefined : json['country'],
    };
}

export function AddressClaimSetToJSON(value?: AddressClaimSet | null): any {
    if (value == null) {
        return value;
    }
    return {
        
        'formatted': value['formatted'],
        'street_address': value['streetAddress'],
        'locality': value['locality'],
        'region': value['region'],
        'postal_code': value['postalCode'],
        'country': value['country'],
    };
}
