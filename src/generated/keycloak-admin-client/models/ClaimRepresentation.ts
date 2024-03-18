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
 * @interface ClaimRepresentation
 */
export interface ClaimRepresentation {
    /**
     * 
     * @type {boolean}
     * @memberof ClaimRepresentation
     */
    name?: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof ClaimRepresentation
     */
    username?: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof ClaimRepresentation
     */
    profile?: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof ClaimRepresentation
     */
    picture?: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof ClaimRepresentation
     */
    website?: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof ClaimRepresentation
     */
    email?: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof ClaimRepresentation
     */
    gender?: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof ClaimRepresentation
     */
    locale?: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof ClaimRepresentation
     */
    address?: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof ClaimRepresentation
     */
    phone?: boolean;
}

/**
 * Check if a given object implements the ClaimRepresentation interface.
 */
export function instanceOfClaimRepresentation(value: object): boolean {
    return true;
}

export function ClaimRepresentationFromJSON(json: any): ClaimRepresentation {
    return ClaimRepresentationFromJSONTyped(json, false);
}

export function ClaimRepresentationFromJSONTyped(json: any, ignoreDiscriminator: boolean): ClaimRepresentation {
    if (json == null) {
        return json;
    }
    return {
        
        'name': json['name'] == null ? undefined : json['name'],
        'username': json['username'] == null ? undefined : json['username'],
        'profile': json['profile'] == null ? undefined : json['profile'],
        'picture': json['picture'] == null ? undefined : json['picture'],
        'website': json['website'] == null ? undefined : json['website'],
        'email': json['email'] == null ? undefined : json['email'],
        'gender': json['gender'] == null ? undefined : json['gender'],
        'locale': json['locale'] == null ? undefined : json['locale'],
        'address': json['address'] == null ? undefined : json['address'],
        'phone': json['phone'] == null ? undefined : json['phone'],
    };
}

export function ClaimRepresentationToJSON(value?: ClaimRepresentation | null): any {
    if (value == null) {
        return value;
    }
    return {
        
        'name': value['name'],
        'username': value['username'],
        'profile': value['profile'],
        'picture': value['picture'],
        'website': value['website'],
        'email': value['email'],
        'gender': value['gender'],
        'locale': value['locale'],
        'address': value['address'],
        'phone': value['phone'],
    };
}

