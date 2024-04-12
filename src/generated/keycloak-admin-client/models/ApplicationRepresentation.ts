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
import type { ClaimRepresentation } from './ClaimRepresentation';
import {
    ClaimRepresentationFromJSON,
    ClaimRepresentationFromJSONTyped,
    ClaimRepresentationToJSON,
} from './ClaimRepresentation';
import type { ProtocolMapperRepresentation } from './ProtocolMapperRepresentation';
import {
    ProtocolMapperRepresentationFromJSON,
    ProtocolMapperRepresentationFromJSONTyped,
    ProtocolMapperRepresentationToJSON,
} from './ProtocolMapperRepresentation';
import type { ResourceServerRepresentation } from './ResourceServerRepresentation';
import {
    ResourceServerRepresentationFromJSON,
    ResourceServerRepresentationFromJSONTyped,
    ResourceServerRepresentationToJSON,
} from './ResourceServerRepresentation';

/**
 * 
 * @export
 * @interface ApplicationRepresentation
 */
export interface ApplicationRepresentation {
    /**
     * 
     * @type {string}
     * @memberof ApplicationRepresentation
     */
    id?: string;
    /**
     * 
     * @type {string}
     * @memberof ApplicationRepresentation
     */
    clientId?: string;
    /**
     * 
     * @type {string}
     * @memberof ApplicationRepresentation
     */
    description?: string;
    /**
     * 
     * @type {string}
     * @memberof ApplicationRepresentation
     */
    rootUrl?: string;
    /**
     * 
     * @type {string}
     * @memberof ApplicationRepresentation
     */
    adminUrl?: string;
    /**
     * 
     * @type {string}
     * @memberof ApplicationRepresentation
     */
    baseUrl?: string;
    /**
     * 
     * @type {boolean}
     * @memberof ApplicationRepresentation
     */
    surrogateAuthRequired?: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof ApplicationRepresentation
     */
    enabled?: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof ApplicationRepresentation
     */
    alwaysDisplayInConsole?: boolean;
    /**
     * 
     * @type {string}
     * @memberof ApplicationRepresentation
     */
    clientAuthenticatorType?: string;
    /**
     * 
     * @type {string}
     * @memberof ApplicationRepresentation
     */
    secret?: string;
    /**
     * 
     * @type {string}
     * @memberof ApplicationRepresentation
     */
    registrationAccessToken?: string;
    /**
     * 
     * @type {Array<string>}
     * @memberof ApplicationRepresentation
     * @deprecated
     */
    defaultRoles?: Array<string>;
    /**
     * 
     * @type {Array<string>}
     * @memberof ApplicationRepresentation
     */
    redirectUris?: Array<string>;
    /**
     * 
     * @type {Array<string>}
     * @memberof ApplicationRepresentation
     */
    webOrigins?: Array<string>;
    /**
     * 
     * @type {number}
     * @memberof ApplicationRepresentation
     */
    notBefore?: number;
    /**
     * 
     * @type {boolean}
     * @memberof ApplicationRepresentation
     */
    bearerOnly?: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof ApplicationRepresentation
     */
    consentRequired?: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof ApplicationRepresentation
     */
    standardFlowEnabled?: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof ApplicationRepresentation
     */
    implicitFlowEnabled?: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof ApplicationRepresentation
     */
    directAccessGrantsEnabled?: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof ApplicationRepresentation
     */
    serviceAccountsEnabled?: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof ApplicationRepresentation
     */
    authorizationServicesEnabled?: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof ApplicationRepresentation
     * @deprecated
     */
    directGrantsOnly?: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof ApplicationRepresentation
     */
    publicClient?: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof ApplicationRepresentation
     */
    frontchannelLogout?: boolean;
    /**
     * 
     * @type {string}
     * @memberof ApplicationRepresentation
     */
    protocol?: string;
    /**
     * 
     * @type {{ [key: string]: string; }}
     * @memberof ApplicationRepresentation
     */
    attributes?: { [key: string]: string; };
    /**
     * 
     * @type {{ [key: string]: string; }}
     * @memberof ApplicationRepresentation
     */
    authenticationFlowBindingOverrides?: { [key: string]: string; };
    /**
     * 
     * @type {boolean}
     * @memberof ApplicationRepresentation
     */
    fullScopeAllowed?: boolean;
    /**
     * 
     * @type {number}
     * @memberof ApplicationRepresentation
     */
    nodeReRegistrationTimeout?: number;
    /**
     * 
     * @type {{ [key: string]: number; }}
     * @memberof ApplicationRepresentation
     */
    registeredNodes?: { [key: string]: number; };
    /**
     * 
     * @type {Array<ProtocolMapperRepresentation>}
     * @memberof ApplicationRepresentation
     */
    protocolMappers?: Array<ProtocolMapperRepresentation>;
    /**
     * 
     * @type {string}
     * @memberof ApplicationRepresentation
     * @deprecated
     */
    clientTemplate?: string;
    /**
     * 
     * @type {boolean}
     * @memberof ApplicationRepresentation
     * @deprecated
     */
    useTemplateConfig?: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof ApplicationRepresentation
     * @deprecated
     */
    useTemplateScope?: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof ApplicationRepresentation
     * @deprecated
     */
    useTemplateMappers?: boolean;
    /**
     * 
     * @type {Array<string>}
     * @memberof ApplicationRepresentation
     */
    defaultClientScopes?: Array<string>;
    /**
     * 
     * @type {Array<string>}
     * @memberof ApplicationRepresentation
     */
    optionalClientScopes?: Array<string>;
    /**
     * 
     * @type {ResourceServerRepresentation}
     * @memberof ApplicationRepresentation
     */
    authorizationSettings?: ResourceServerRepresentation;
    /**
     * 
     * @type {{ [key: string]: boolean; }}
     * @memberof ApplicationRepresentation
     */
    access?: { [key: string]: boolean; };
    /**
     * 
     * @type {string}
     * @memberof ApplicationRepresentation
     */
    origin?: string;
    /**
     * 
     * @type {string}
     * @memberof ApplicationRepresentation
     */
    name?: string;
    /**
     * 
     * @type {ClaimRepresentation}
     * @memberof ApplicationRepresentation
     */
    claims?: ClaimRepresentation;
}

/**
 * Check if a given object implements the ApplicationRepresentation interface.
 */
export function instanceOfApplicationRepresentation(value: object): boolean {
    return true;
}

export function ApplicationRepresentationFromJSON(json: any): ApplicationRepresentation {
    return ApplicationRepresentationFromJSONTyped(json, false);
}

export function ApplicationRepresentationFromJSONTyped(json: any, ignoreDiscriminator: boolean): ApplicationRepresentation {
    if (json == null) {
        return json;
    }
    return {
        
        'id': json['id'] == null ? undefined : json['id'],
        'clientId': json['clientId'] == null ? undefined : json['clientId'],
        'description': json['description'] == null ? undefined : json['description'],
        'rootUrl': json['rootUrl'] == null ? undefined : json['rootUrl'],
        'adminUrl': json['adminUrl'] == null ? undefined : json['adminUrl'],
        'baseUrl': json['baseUrl'] == null ? undefined : json['baseUrl'],
        'surrogateAuthRequired': json['surrogateAuthRequired'] == null ? undefined : json['surrogateAuthRequired'],
        'enabled': json['enabled'] == null ? undefined : json['enabled'],
        'alwaysDisplayInConsole': json['alwaysDisplayInConsole'] == null ? undefined : json['alwaysDisplayInConsole'],
        'clientAuthenticatorType': json['clientAuthenticatorType'] == null ? undefined : json['clientAuthenticatorType'],
        'secret': json['secret'] == null ? undefined : json['secret'],
        'registrationAccessToken': json['registrationAccessToken'] == null ? undefined : json['registrationAccessToken'],
        'defaultRoles': json['defaultRoles'] == null ? undefined : json['defaultRoles'],
        'redirectUris': json['redirectUris'] == null ? undefined : json['redirectUris'],
        'webOrigins': json['webOrigins'] == null ? undefined : json['webOrigins'],
        'notBefore': json['notBefore'] == null ? undefined : json['notBefore'],
        'bearerOnly': json['bearerOnly'] == null ? undefined : json['bearerOnly'],
        'consentRequired': json['consentRequired'] == null ? undefined : json['consentRequired'],
        'standardFlowEnabled': json['standardFlowEnabled'] == null ? undefined : json['standardFlowEnabled'],
        'implicitFlowEnabled': json['implicitFlowEnabled'] == null ? undefined : json['implicitFlowEnabled'],
        'directAccessGrantsEnabled': json['directAccessGrantsEnabled'] == null ? undefined : json['directAccessGrantsEnabled'],
        'serviceAccountsEnabled': json['serviceAccountsEnabled'] == null ? undefined : json['serviceAccountsEnabled'],
        'authorizationServicesEnabled': json['authorizationServicesEnabled'] == null ? undefined : json['authorizationServicesEnabled'],
        'directGrantsOnly': json['directGrantsOnly'] == null ? undefined : json['directGrantsOnly'],
        'publicClient': json['publicClient'] == null ? undefined : json['publicClient'],
        'frontchannelLogout': json['frontchannelLogout'] == null ? undefined : json['frontchannelLogout'],
        'protocol': json['protocol'] == null ? undefined : json['protocol'],
        'attributes': json['attributes'] == null ? undefined : json['attributes'],
        'authenticationFlowBindingOverrides': json['authenticationFlowBindingOverrides'] == null ? undefined : json['authenticationFlowBindingOverrides'],
        'fullScopeAllowed': json['fullScopeAllowed'] == null ? undefined : json['fullScopeAllowed'],
        'nodeReRegistrationTimeout': json['nodeReRegistrationTimeout'] == null ? undefined : json['nodeReRegistrationTimeout'],
        'registeredNodes': json['registeredNodes'] == null ? undefined : json['registeredNodes'],
        'protocolMappers': json['protocolMappers'] == null ? undefined : ((json['protocolMappers'] as Array<any>).map(ProtocolMapperRepresentationFromJSON)),
        'clientTemplate': json['clientTemplate'] == null ? undefined : json['clientTemplate'],
        'useTemplateConfig': json['useTemplateConfig'] == null ? undefined : json['useTemplateConfig'],
        'useTemplateScope': json['useTemplateScope'] == null ? undefined : json['useTemplateScope'],
        'useTemplateMappers': json['useTemplateMappers'] == null ? undefined : json['useTemplateMappers'],
        'defaultClientScopes': json['defaultClientScopes'] == null ? undefined : json['defaultClientScopes'],
        'optionalClientScopes': json['optionalClientScopes'] == null ? undefined : json['optionalClientScopes'],
        'authorizationSettings': json['authorizationSettings'] == null ? undefined : ResourceServerRepresentationFromJSON(json['authorizationSettings']),
        'access': json['access'] == null ? undefined : json['access'],
        'origin': json['origin'] == null ? undefined : json['origin'],
        'name': json['name'] == null ? undefined : json['name'],
        'claims': json['claims'] == null ? undefined : ClaimRepresentationFromJSON(json['claims']),
    };
}

export function ApplicationRepresentationToJSON(value?: ApplicationRepresentation | null): any {
    if (value == null) {
        return value;
    }
    return {
        
        'id': value['id'],
        'clientId': value['clientId'],
        'description': value['description'],
        'rootUrl': value['rootUrl'],
        'adminUrl': value['adminUrl'],
        'baseUrl': value['baseUrl'],
        'surrogateAuthRequired': value['surrogateAuthRequired'],
        'enabled': value['enabled'],
        'alwaysDisplayInConsole': value['alwaysDisplayInConsole'],
        'clientAuthenticatorType': value['clientAuthenticatorType'],
        'secret': value['secret'],
        'registrationAccessToken': value['registrationAccessToken'],
        'defaultRoles': value['defaultRoles'],
        'redirectUris': value['redirectUris'],
        'webOrigins': value['webOrigins'],
        'notBefore': value['notBefore'],
        'bearerOnly': value['bearerOnly'],
        'consentRequired': value['consentRequired'],
        'standardFlowEnabled': value['standardFlowEnabled'],
        'implicitFlowEnabled': value['implicitFlowEnabled'],
        'directAccessGrantsEnabled': value['directAccessGrantsEnabled'],
        'serviceAccountsEnabled': value['serviceAccountsEnabled'],
        'authorizationServicesEnabled': value['authorizationServicesEnabled'],
        'directGrantsOnly': value['directGrantsOnly'],
        'publicClient': value['publicClient'],
        'frontchannelLogout': value['frontchannelLogout'],
        'protocol': value['protocol'],
        'attributes': value['attributes'],
        'authenticationFlowBindingOverrides': value['authenticationFlowBindingOverrides'],
        'fullScopeAllowed': value['fullScopeAllowed'],
        'nodeReRegistrationTimeout': value['nodeReRegistrationTimeout'],
        'registeredNodes': value['registeredNodes'],
        'protocolMappers': value['protocolMappers'] == null ? undefined : ((value['protocolMappers'] as Array<any>).map(ProtocolMapperRepresentationToJSON)),
        'clientTemplate': value['clientTemplate'],
        'useTemplateConfig': value['useTemplateConfig'],
        'useTemplateScope': value['useTemplateScope'],
        'useTemplateMappers': value['useTemplateMappers'],
        'defaultClientScopes': value['defaultClientScopes'],
        'optionalClientScopes': value['optionalClientScopes'],
        'authorizationSettings': ResourceServerRepresentationToJSON(value['authorizationSettings']),
        'access': value['access'],
        'origin': value['origin'],
        'name': value['name'],
        'claims': ClaimRepresentationToJSON(value['claims']),
    };
}
