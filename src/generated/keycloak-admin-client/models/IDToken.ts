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
import type { AddressClaimSet } from './AddressClaimSet';
import {
    AddressClaimSetFromJSON,
    AddressClaimSetFromJSONTyped,
    AddressClaimSetToJSON,
} from './AddressClaimSet';

/**
 * 
 * @export
 * @interface IDToken
 */
export interface IDToken {
    /**
     * 
     * @type {string}
     * @memberof IDToken
     */
    jti?: string;
    /**
     * 
     * @type {number}
     * @memberof IDToken
     */
    exp?: number;
    /**
     * 
     * @type {number}
     * @memberof IDToken
     */
    nbf?: number;
    /**
     * 
     * @type {number}
     * @memberof IDToken
     */
    iat?: number;
    /**
     * 
     * @type {string}
     * @memberof IDToken
     */
    iss?: string;
    /**
     * 
     * @type {string}
     * @memberof IDToken
     */
    sub?: string;
    /**
     * 
     * @type {string}
     * @memberof IDToken
     */
    typ?: string;
    /**
     * 
     * @type {string}
     * @memberof IDToken
     */
    azp?: string;
    /**
     * 
     * @type {{ [key: string]: any; }}
     * @memberof IDToken
     */
    otherClaims?: { [key: string]: any; };
    /**
     * 
     * @type {string}
     * @memberof IDToken
     */
    nonce?: string;
    /**
     * 
     * @type {number}
     * @memberof IDToken
     */
    authTime?: number;
    /**
     * 
     * @type {string}
     * @memberof IDToken
     */
    sessionState?: string;
    /**
     * 
     * @type {string}
     * @memberof IDToken
     */
    atHash?: string;
    /**
     * 
     * @type {string}
     * @memberof IDToken
     */
    cHash?: string;
    /**
     * 
     * @type {string}
     * @memberof IDToken
     */
    name?: string;
    /**
     * 
     * @type {string}
     * @memberof IDToken
     */
    givenName?: string;
    /**
     * 
     * @type {string}
     * @memberof IDToken
     */
    familyName?: string;
    /**
     * 
     * @type {string}
     * @memberof IDToken
     */
    middleName?: string;
    /**
     * 
     * @type {string}
     * @memberof IDToken
     */
    nickname?: string;
    /**
     * 
     * @type {string}
     * @memberof IDToken
     */
    preferredUsername?: string;
    /**
     * 
     * @type {string}
     * @memberof IDToken
     */
    profile?: string;
    /**
     * 
     * @type {string}
     * @memberof IDToken
     */
    picture?: string;
    /**
     * 
     * @type {string}
     * @memberof IDToken
     */
    website?: string;
    /**
     * 
     * @type {string}
     * @memberof IDToken
     */
    email?: string;
    /**
     * 
     * @type {boolean}
     * @memberof IDToken
     */
    emailVerified?: boolean;
    /**
     * 
     * @type {string}
     * @memberof IDToken
     */
    gender?: string;
    /**
     * 
     * @type {string}
     * @memberof IDToken
     */
    birthdate?: string;
    /**
     * 
     * @type {string}
     * @memberof IDToken
     */
    zoneinfo?: string;
    /**
     * 
     * @type {string}
     * @memberof IDToken
     */
    locale?: string;
    /**
     * 
     * @type {string}
     * @memberof IDToken
     */
    phoneNumber?: string;
    /**
     * 
     * @type {boolean}
     * @memberof IDToken
     */
    phoneNumberVerified?: boolean;
    /**
     * 
     * @type {AddressClaimSet}
     * @memberof IDToken
     */
    address?: AddressClaimSet;
    /**
     * 
     * @type {number}
     * @memberof IDToken
     */
    updatedAt?: number;
    /**
     * 
     * @type {string}
     * @memberof IDToken
     */
    claimsLocales?: string;
    /**
     * 
     * @type {string}
     * @memberof IDToken
     */
    acr?: string;
    /**
     * 
     * @type {string}
     * @memberof IDToken
     */
    sHash?: string;
    /**
     * 
     * @type {string}
     * @memberof IDToken
     */
    sid?: string;
}

/**
 * Check if a given object implements the IDToken interface.
 */
export function instanceOfIDToken(value: object): boolean {
    return true;
}

export function IDTokenFromJSON(json: any): IDToken {
    return IDTokenFromJSONTyped(json, false);
}

export function IDTokenFromJSONTyped(json: any, ignoreDiscriminator: boolean): IDToken {
    if (json == null) {
        return json;
    }
    return {
        
        'jti': json['jti'] == null ? undefined : json['jti'],
        'exp': json['exp'] == null ? undefined : json['exp'],
        'nbf': json['nbf'] == null ? undefined : json['nbf'],
        'iat': json['iat'] == null ? undefined : json['iat'],
        'iss': json['iss'] == null ? undefined : json['iss'],
        'sub': json['sub'] == null ? undefined : json['sub'],
        'typ': json['typ'] == null ? undefined : json['typ'],
        'azp': json['azp'] == null ? undefined : json['azp'],
        'otherClaims': json['otherClaims'] == null ? undefined : json['otherClaims'],
        'nonce': json['nonce'] == null ? undefined : json['nonce'],
        'authTime': json['auth_time'] == null ? undefined : json['auth_time'],
        'sessionState': json['session_state'] == null ? undefined : json['session_state'],
        'atHash': json['at_hash'] == null ? undefined : json['at_hash'],
        'cHash': json['c_hash'] == null ? undefined : json['c_hash'],
        'name': json['name'] == null ? undefined : json['name'],
        'givenName': json['given_name'] == null ? undefined : json['given_name'],
        'familyName': json['family_name'] == null ? undefined : json['family_name'],
        'middleName': json['middle_name'] == null ? undefined : json['middle_name'],
        'nickname': json['nickname'] == null ? undefined : json['nickname'],
        'preferredUsername': json['preferred_username'] == null ? undefined : json['preferred_username'],
        'profile': json['profile'] == null ? undefined : json['profile'],
        'picture': json['picture'] == null ? undefined : json['picture'],
        'website': json['website'] == null ? undefined : json['website'],
        'email': json['email'] == null ? undefined : json['email'],
        'emailVerified': json['email_verified'] == null ? undefined : json['email_verified'],
        'gender': json['gender'] == null ? undefined : json['gender'],
        'birthdate': json['birthdate'] == null ? undefined : json['birthdate'],
        'zoneinfo': json['zoneinfo'] == null ? undefined : json['zoneinfo'],
        'locale': json['locale'] == null ? undefined : json['locale'],
        'phoneNumber': json['phone_number'] == null ? undefined : json['phone_number'],
        'phoneNumberVerified': json['phone_number_verified'] == null ? undefined : json['phone_number_verified'],
        'address': json['address'] == null ? undefined : AddressClaimSetFromJSON(json['address']),
        'updatedAt': json['updated_at'] == null ? undefined : json['updated_at'],
        'claimsLocales': json['claims_locales'] == null ? undefined : json['claims_locales'],
        'acr': json['acr'] == null ? undefined : json['acr'],
        'sHash': json['s_hash'] == null ? undefined : json['s_hash'],
        'sid': json['sid'] == null ? undefined : json['sid'],
    };
}

export function IDTokenToJSON(value?: IDToken | null): any {
    if (value == null) {
        return value;
    }
    return {
        
        'jti': value['jti'],
        'exp': value['exp'],
        'nbf': value['nbf'],
        'iat': value['iat'],
        'iss': value['iss'],
        'sub': value['sub'],
        'typ': value['typ'],
        'azp': value['azp'],
        'otherClaims': value['otherClaims'],
        'nonce': value['nonce'],
        'auth_time': value['authTime'],
        'session_state': value['sessionState'],
        'at_hash': value['atHash'],
        'c_hash': value['cHash'],
        'name': value['name'],
        'given_name': value['givenName'],
        'family_name': value['familyName'],
        'middle_name': value['middleName'],
        'nickname': value['nickname'],
        'preferred_username': value['preferredUsername'],
        'profile': value['profile'],
        'picture': value['picture'],
        'website': value['website'],
        'email': value['email'],
        'email_verified': value['emailVerified'],
        'gender': value['gender'],
        'birthdate': value['birthdate'],
        'zoneinfo': value['zoneinfo'],
        'locale': value['locale'],
        'phone_number': value['phoneNumber'],
        'phone_number_verified': value['phoneNumberVerified'],
        'address': AddressClaimSetToJSON(value['address']),
        'updated_at': value['updatedAt'],
        'claims_locales': value['claimsLocales'],
        'acr': value['acr'],
        's_hash': value['sHash'],
        'sid': value['sid'],
    };
}

