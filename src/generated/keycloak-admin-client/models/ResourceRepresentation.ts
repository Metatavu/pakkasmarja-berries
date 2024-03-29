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
import type { ResourceRepresentationOwner } from './ResourceRepresentationOwner';
import {
    ResourceRepresentationOwnerFromJSON,
    ResourceRepresentationOwnerFromJSONTyped,
    ResourceRepresentationOwnerToJSON,
} from './ResourceRepresentationOwner';
import type { ScopeRepresentation } from './ScopeRepresentation';
import {
    ScopeRepresentationFromJSON,
    ScopeRepresentationFromJSONTyped,
    ScopeRepresentationToJSON,
} from './ScopeRepresentation';

/**
 * 
 * @export
 * @interface ResourceRepresentation
 */
export interface ResourceRepresentation {
    /**
     * 
     * @type {string}
     * @memberof ResourceRepresentation
     */
    id?: string;
    /**
     * 
     * @type {string}
     * @memberof ResourceRepresentation
     */
    name?: string;
    /**
     * 
     * @type {Set<string>}
     * @memberof ResourceRepresentation
     */
    uris?: Set<string>;
    /**
     * 
     * @type {string}
     * @memberof ResourceRepresentation
     */
    type?: string;
    /**
     * 
     * @type {Set<ScopeRepresentation>}
     * @memberof ResourceRepresentation
     */
    scopes?: Set<ScopeRepresentation>;
    /**
     * 
     * @type {string}
     * @memberof ResourceRepresentation
     */
    iconUri?: string;
    /**
     * 
     * @type {ResourceRepresentationOwner}
     * @memberof ResourceRepresentation
     */
    owner?: ResourceRepresentationOwner;
    /**
     * 
     * @type {boolean}
     * @memberof ResourceRepresentation
     */
    ownerManagedAccess?: boolean;
    /**
     * 
     * @type {string}
     * @memberof ResourceRepresentation
     */
    displayName?: string;
    /**
     * 
     * @type {{ [key: string]: Array<string>; }}
     * @memberof ResourceRepresentation
     */
    attributes?: { [key: string]: Array<string>; };
    /**
     * 
     * @type {string}
     * @memberof ResourceRepresentation
     * @deprecated
     */
    uri?: string;
    /**
     * 
     * @type {Set<ScopeRepresentation>}
     * @memberof ResourceRepresentation
     */
    scopesUma?: Set<ScopeRepresentation>;
}

/**
 * Check if a given object implements the ResourceRepresentation interface.
 */
export function instanceOfResourceRepresentation(value: object): boolean {
    return true;
}

export function ResourceRepresentationFromJSON(json: any): ResourceRepresentation {
    return ResourceRepresentationFromJSONTyped(json, false);
}

export function ResourceRepresentationFromJSONTyped(json: any, ignoreDiscriminator: boolean): ResourceRepresentation {
    if (json == null) {
        return json;
    }
    return {
        
        'id': json['_id'] == null ? undefined : json['_id'],
        'name': json['name'] == null ? undefined : json['name'],
        'uris': json['uris'] == null ? undefined : json['uris'],
        'type': json['type'] == null ? undefined : json['type'],
        'scopes': json['scopes'] == null ? undefined : new Set((json['scopes'] as Array<any>).map(ScopeRepresentationFromJSON)),
        'iconUri': json['icon_uri'] == null ? undefined : json['icon_uri'],
        'owner': json['owner'] == null ? undefined : ResourceRepresentationOwnerFromJSON(json['owner']),
        'ownerManagedAccess': json['ownerManagedAccess'] == null ? undefined : json['ownerManagedAccess'],
        'displayName': json['displayName'] == null ? undefined : json['displayName'],
        'attributes': json['attributes'] == null ? undefined : json['attributes'],
        'uri': json['uri'] == null ? undefined : json['uri'],
        'scopesUma': json['scopesUma'] == null ? undefined : new Set((json['scopesUma'] as Array<any>).map(ScopeRepresentationFromJSON)),
    };
}

export function ResourceRepresentationToJSON(value?: ResourceRepresentation | null): any {
    if (value == null) {
        return value;
    }
    return {
        
        '_id': value['id'],
        'name': value['name'],
        'uris': value['uris'] == null ? undefined : Array.from(value['uris'] as Set<any>),
        'type': value['type'],
        'scopes': value['scopes'] == null ? undefined : (Array.from(value['scopes'] as Set<any>).map(ScopeRepresentationToJSON)),
        'icon_uri': value['iconUri'],
        'owner': ResourceRepresentationOwnerToJSON(value['owner']),
        'ownerManagedAccess': value['ownerManagedAccess'],
        'displayName': value['displayName'],
        'attributes': value['attributes'],
        'uri': value['uri'],
        'scopesUma': value['scopesUma'] == null ? undefined : (Array.from(value['scopesUma'] as Set<any>).map(ScopeRepresentationToJSON)),
    };
}

