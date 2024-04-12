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


import * as runtime from '../runtime';
import type {
  ClientInitialAccessCreatePresentation,
  ClientInitialAccessPresentation,
} from '../models/index';
import {
    ClientInitialAccessCreatePresentationFromJSON,
    ClientInitialAccessCreatePresentationToJSON,
    ClientInitialAccessPresentationFromJSON,
    ClientInitialAccessPresentationToJSON,
} from '../models/index';

export interface AdminRealmsRealmClientsInitialAccessGetRequest {
    realm: string;
}

export interface AdminRealmsRealmClientsInitialAccessIdDeleteRequest {
    realm: string;
    id: string;
}

export interface AdminRealmsRealmClientsInitialAccessPostRequest {
    realm: string;
    clientInitialAccessCreatePresentation?: ClientInitialAccessCreatePresentation;
}

/**
 * 
 */
export class ClientInitialAccessApi extends runtime.BaseAPI {

    /**
     */
    async adminRealmsRealmClientsInitialAccessGetRaw(requestParameters: AdminRealmsRealmClientsInitialAccessGetRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<Array<ClientInitialAccessPresentation>>> {
        if (requestParameters['realm'] == null) {
            throw new runtime.RequiredError(
                'realm',
                'Required parameter "realm" was null or undefined when calling adminRealmsRealmClientsInitialAccessGet().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        const response = await this.request({
            path: `/admin/realms/{realm}/clients-initial-access`.replace(`{${"realm"}}`, encodeURIComponent(String(requestParameters['realm']))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => jsonValue.map(ClientInitialAccessPresentationFromJSON));
    }

    /**
     */
    async adminRealmsRealmClientsInitialAccessGet(requestParameters: AdminRealmsRealmClientsInitialAccessGetRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<Array<ClientInitialAccessPresentation>> {
        const response = await this.adminRealmsRealmClientsInitialAccessGetRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     */
    async adminRealmsRealmClientsInitialAccessIdDeleteRaw(requestParameters: AdminRealmsRealmClientsInitialAccessIdDeleteRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<void>> {
        if (requestParameters['realm'] == null) {
            throw new runtime.RequiredError(
                'realm',
                'Required parameter "realm" was null or undefined when calling adminRealmsRealmClientsInitialAccessIdDelete().'
            );
        }

        if (requestParameters['id'] == null) {
            throw new runtime.RequiredError(
                'id',
                'Required parameter "id" was null or undefined when calling adminRealmsRealmClientsInitialAccessIdDelete().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        const response = await this.request({
            path: `/admin/realms/{realm}/clients-initial-access/{id}`.replace(`{${"realm"}}`, encodeURIComponent(String(requestParameters['realm']))).replace(`{${"id"}}`, encodeURIComponent(String(requestParameters['id']))),
            method: 'DELETE',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.VoidApiResponse(response);
    }

    /**
     */
    async adminRealmsRealmClientsInitialAccessIdDelete(requestParameters: AdminRealmsRealmClientsInitialAccessIdDeleteRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<void> {
        await this.adminRealmsRealmClientsInitialAccessIdDeleteRaw(requestParameters, initOverrides);
    }

    /**
     * Create a new initial access token.
     */
    async adminRealmsRealmClientsInitialAccessPostRaw(requestParameters: AdminRealmsRealmClientsInitialAccessPostRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<ClientInitialAccessCreatePresentation>> {
        if (requestParameters['realm'] == null) {
            throw new runtime.RequiredError(
                'realm',
                'Required parameter "realm" was null or undefined when calling adminRealmsRealmClientsInitialAccessPost().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        const response = await this.request({
            path: `/admin/realms/{realm}/clients-initial-access`.replace(`{${"realm"}}`, encodeURIComponent(String(requestParameters['realm']))),
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
            body: ClientInitialAccessCreatePresentationToJSON(requestParameters['clientInitialAccessCreatePresentation']),
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => ClientInitialAccessCreatePresentationFromJSON(jsonValue));
    }

    /**
     * Create a new initial access token.
     */
    async adminRealmsRealmClientsInitialAccessPost(requestParameters: AdminRealmsRealmClientsInitialAccessPostRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<ClientInitialAccessCreatePresentation> {
        const response = await this.adminRealmsRealmClientsInitialAccessPostRaw(requestParameters, initOverrides);
        return await response.value();
    }

}