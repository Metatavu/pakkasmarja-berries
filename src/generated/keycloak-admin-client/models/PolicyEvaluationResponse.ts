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
import type { AccessToken } from './AccessToken';
import {
    AccessTokenFromJSON,
    AccessTokenFromJSONTyped,
    AccessTokenToJSON,
} from './AccessToken';
import type { DecisionEffect } from './DecisionEffect';
import {
    DecisionEffectFromJSON,
    DecisionEffectFromJSONTyped,
    DecisionEffectToJSON,
} from './DecisionEffect';
import type { EvaluationResultRepresentation } from './EvaluationResultRepresentation';
import {
    EvaluationResultRepresentationFromJSON,
    EvaluationResultRepresentationFromJSONTyped,
    EvaluationResultRepresentationToJSON,
} from './EvaluationResultRepresentation';

/**
 * 
 * @export
 * @interface PolicyEvaluationResponse
 */
export interface PolicyEvaluationResponse {
    /**
     * 
     * @type {Array<EvaluationResultRepresentation>}
     * @memberof PolicyEvaluationResponse
     */
    results?: Array<EvaluationResultRepresentation>;
    /**
     * 
     * @type {boolean}
     * @memberof PolicyEvaluationResponse
     */
    entitlements?: boolean;
    /**
     * 
     * @type {DecisionEffect}
     * @memberof PolicyEvaluationResponse
     */
    status?: DecisionEffect;
    /**
     * 
     * @type {AccessToken}
     * @memberof PolicyEvaluationResponse
     */
    rpt?: AccessToken;
}

/**
 * Check if a given object implements the PolicyEvaluationResponse interface.
 */
export function instanceOfPolicyEvaluationResponse(value: object): boolean {
    return true;
}

export function PolicyEvaluationResponseFromJSON(json: any): PolicyEvaluationResponse {
    return PolicyEvaluationResponseFromJSONTyped(json, false);
}

export function PolicyEvaluationResponseFromJSONTyped(json: any, ignoreDiscriminator: boolean): PolicyEvaluationResponse {
    if (json == null) {
        return json;
    }
    return {
        
        'results': json['results'] == null ? undefined : ((json['results'] as Array<any>).map(EvaluationResultRepresentationFromJSON)),
        'entitlements': json['entitlements'] == null ? undefined : json['entitlements'],
        'status': json['status'] == null ? undefined : DecisionEffectFromJSON(json['status']),
        'rpt': json['rpt'] == null ? undefined : AccessTokenFromJSON(json['rpt']),
    };
}

export function PolicyEvaluationResponseToJSON(value?: PolicyEvaluationResponse | null): any {
    if (value == null) {
        return value;
    }
    return {
        
        'results': value['results'] == null ? undefined : ((value['results'] as Array<any>).map(EvaluationResultRepresentationToJSON)),
        'entitlements': value['entitlements'],
        'status': DecisionEffectToJSON(value['status']),
        'rpt': AccessTokenToJSON(value['rpt']),
    };
}
