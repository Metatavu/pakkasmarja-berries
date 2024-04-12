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
  ManagementPermissionReference,
  RoleRepresentation,
} from '../models/index';
import {
    ManagementPermissionReferenceFromJSON,
    ManagementPermissionReferenceToJSON,
    RoleRepresentationFromJSON,
    RoleRepresentationToJSON,
} from '../models/index';

export interface AdminRealmsRealmRolesByIdRoleIdCompositesClientsClientUuidGetRequest {
    realm: string;
    clientUuid: string;
    roleId: string;
}

export interface AdminRealmsRealmRolesByIdRoleIdCompositesDeleteRequest {
    realm: string;
    roleId: string;
    roleRepresentation?: Array<RoleRepresentation>;
}

export interface AdminRealmsRealmRolesByIdRoleIdCompositesGetRequest {
    realm: string;
    roleId: string;
    first?: number;
    max?: number;
    search?: string;
}

export interface AdminRealmsRealmRolesByIdRoleIdCompositesPostRequest {
    realm: string;
    roleId: string;
    roleRepresentation?: Array<RoleRepresentation>;
}

export interface AdminRealmsRealmRolesByIdRoleIdCompositesRealmGetRequest {
    realm: string;
    roleId: string;
}

export interface AdminRealmsRealmRolesByIdRoleIdDeleteRequest {
    realm: string;
    roleId: string;
}

export interface AdminRealmsRealmRolesByIdRoleIdGetRequest {
    realm: string;
    roleId: string;
}

export interface AdminRealmsRealmRolesByIdRoleIdManagementPermissionsGetRequest {
    realm: string;
    roleId: string;
}

export interface AdminRealmsRealmRolesByIdRoleIdManagementPermissionsPutRequest {
    realm: string;
    roleId: string;
    managementPermissionReference?: ManagementPermissionReference;
}

export interface AdminRealmsRealmRolesByIdRoleIdPutRequest {
    realm: string;
    roleId: string;
    roleRepresentation?: RoleRepresentation;
}

/**
 * 
 */
export class RolesByIDApi extends runtime.BaseAPI {

    /**
     * Get client-level roles for the client that are in the role\'s composite
     */
    async adminRealmsRealmRolesByIdRoleIdCompositesClientsClientUuidGetRaw(requestParameters: AdminRealmsRealmRolesByIdRoleIdCompositesClientsClientUuidGetRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<Array<RoleRepresentation>>> {
        if (requestParameters['realm'] == null) {
            throw new runtime.RequiredError(
                'realm',
                'Required parameter "realm" was null or undefined when calling adminRealmsRealmRolesByIdRoleIdCompositesClientsClientUuidGet().'
            );
        }

        if (requestParameters['clientUuid'] == null) {
            throw new runtime.RequiredError(
                'clientUuid',
                'Required parameter "clientUuid" was null or undefined when calling adminRealmsRealmRolesByIdRoleIdCompositesClientsClientUuidGet().'
            );
        }

        if (requestParameters['roleId'] == null) {
            throw new runtime.RequiredError(
                'roleId',
                'Required parameter "roleId" was null or undefined when calling adminRealmsRealmRolesByIdRoleIdCompositesClientsClientUuidGet().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        const response = await this.request({
            path: `/admin/realms/{realm}/roles-by-id/{role-id}/composites/clients/{clientUuid}`.replace(`{${"realm"}}`, encodeURIComponent(String(requestParameters['realm']))).replace(`{${"clientUuid"}}`, encodeURIComponent(String(requestParameters['clientUuid']))).replace(`{${"role-id"}}`, encodeURIComponent(String(requestParameters['roleId']))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => jsonValue.map(RoleRepresentationFromJSON));
    }

    /**
     * Get client-level roles for the client that are in the role\'s composite
     */
    async adminRealmsRealmRolesByIdRoleIdCompositesClientsClientUuidGet(requestParameters: AdminRealmsRealmRolesByIdRoleIdCompositesClientsClientUuidGetRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<Array<RoleRepresentation>> {
        const response = await this.adminRealmsRealmRolesByIdRoleIdCompositesClientsClientUuidGetRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Remove a set of roles from the role\'s composite
     */
    async adminRealmsRealmRolesByIdRoleIdCompositesDeleteRaw(requestParameters: AdminRealmsRealmRolesByIdRoleIdCompositesDeleteRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<void>> {
        if (requestParameters['realm'] == null) {
            throw new runtime.RequiredError(
                'realm',
                'Required parameter "realm" was null or undefined when calling adminRealmsRealmRolesByIdRoleIdCompositesDelete().'
            );
        }

        if (requestParameters['roleId'] == null) {
            throw new runtime.RequiredError(
                'roleId',
                'Required parameter "roleId" was null or undefined when calling adminRealmsRealmRolesByIdRoleIdCompositesDelete().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        const response = await this.request({
            path: `/admin/realms/{realm}/roles-by-id/{role-id}/composites`.replace(`{${"realm"}}`, encodeURIComponent(String(requestParameters['realm']))).replace(`{${"role-id"}}`, encodeURIComponent(String(requestParameters['roleId']))),
            method: 'DELETE',
            headers: headerParameters,
            query: queryParameters,
            body: requestParameters['roleRepresentation']!.map(RoleRepresentationToJSON),
        }, initOverrides);

        return new runtime.VoidApiResponse(response);
    }

    /**
     * Remove a set of roles from the role\'s composite
     */
    async adminRealmsRealmRolesByIdRoleIdCompositesDelete(requestParameters: AdminRealmsRealmRolesByIdRoleIdCompositesDeleteRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<void> {
        await this.adminRealmsRealmRolesByIdRoleIdCompositesDeleteRaw(requestParameters, initOverrides);
    }

    /**
     * Get role\'s children Returns a set of role\'s children provided the role is a composite.
     */
    async adminRealmsRealmRolesByIdRoleIdCompositesGetRaw(requestParameters: AdminRealmsRealmRolesByIdRoleIdCompositesGetRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<Array<RoleRepresentation>>> {
        if (requestParameters['realm'] == null) {
            throw new runtime.RequiredError(
                'realm',
                'Required parameter "realm" was null or undefined when calling adminRealmsRealmRolesByIdRoleIdCompositesGet().'
            );
        }

        if (requestParameters['roleId'] == null) {
            throw new runtime.RequiredError(
                'roleId',
                'Required parameter "roleId" was null or undefined when calling adminRealmsRealmRolesByIdRoleIdCompositesGet().'
            );
        }

        const queryParameters: any = {};

        if (requestParameters['first'] != null) {
            queryParameters['first'] = requestParameters['first'];
        }

        if (requestParameters['max'] != null) {
            queryParameters['max'] = requestParameters['max'];
        }

        if (requestParameters['search'] != null) {
            queryParameters['search'] = requestParameters['search'];
        }

        const headerParameters: runtime.HTTPHeaders = {};

        const response = await this.request({
            path: `/admin/realms/{realm}/roles-by-id/{role-id}/composites`.replace(`{${"realm"}}`, encodeURIComponent(String(requestParameters['realm']))).replace(`{${"role-id"}}`, encodeURIComponent(String(requestParameters['roleId']))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => jsonValue.map(RoleRepresentationFromJSON));
    }

    /**
     * Get role\'s children Returns a set of role\'s children provided the role is a composite.
     */
    async adminRealmsRealmRolesByIdRoleIdCompositesGet(requestParameters: AdminRealmsRealmRolesByIdRoleIdCompositesGetRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<Array<RoleRepresentation>> {
        const response = await this.adminRealmsRealmRolesByIdRoleIdCompositesGetRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Make the role a composite role by associating some child roles
     */
    async adminRealmsRealmRolesByIdRoleIdCompositesPostRaw(requestParameters: AdminRealmsRealmRolesByIdRoleIdCompositesPostRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<void>> {
        if (requestParameters['realm'] == null) {
            throw new runtime.RequiredError(
                'realm',
                'Required parameter "realm" was null or undefined when calling adminRealmsRealmRolesByIdRoleIdCompositesPost().'
            );
        }

        if (requestParameters['roleId'] == null) {
            throw new runtime.RequiredError(
                'roleId',
                'Required parameter "roleId" was null or undefined when calling adminRealmsRealmRolesByIdRoleIdCompositesPost().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        const response = await this.request({
            path: `/admin/realms/{realm}/roles-by-id/{role-id}/composites`.replace(`{${"realm"}}`, encodeURIComponent(String(requestParameters['realm']))).replace(`{${"role-id"}}`, encodeURIComponent(String(requestParameters['roleId']))),
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
            body: requestParameters['roleRepresentation']!.map(RoleRepresentationToJSON),
        }, initOverrides);

        return new runtime.VoidApiResponse(response);
    }

    /**
     * Make the role a composite role by associating some child roles
     */
    async adminRealmsRealmRolesByIdRoleIdCompositesPost(requestParameters: AdminRealmsRealmRolesByIdRoleIdCompositesPostRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<void> {
        await this.adminRealmsRealmRolesByIdRoleIdCompositesPostRaw(requestParameters, initOverrides);
    }

    /**
     * Get realm-level roles that are in the role\'s composite
     */
    async adminRealmsRealmRolesByIdRoleIdCompositesRealmGetRaw(requestParameters: AdminRealmsRealmRolesByIdRoleIdCompositesRealmGetRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<Array<RoleRepresentation>>> {
        if (requestParameters['realm'] == null) {
            throw new runtime.RequiredError(
                'realm',
                'Required parameter "realm" was null or undefined when calling adminRealmsRealmRolesByIdRoleIdCompositesRealmGet().'
            );
        }

        if (requestParameters['roleId'] == null) {
            throw new runtime.RequiredError(
                'roleId',
                'Required parameter "roleId" was null or undefined when calling adminRealmsRealmRolesByIdRoleIdCompositesRealmGet().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        const response = await this.request({
            path: `/admin/realms/{realm}/roles-by-id/{role-id}/composites/realm`.replace(`{${"realm"}}`, encodeURIComponent(String(requestParameters['realm']))).replace(`{${"role-id"}}`, encodeURIComponent(String(requestParameters['roleId']))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => jsonValue.map(RoleRepresentationFromJSON));
    }

    /**
     * Get realm-level roles that are in the role\'s composite
     */
    async adminRealmsRealmRolesByIdRoleIdCompositesRealmGet(requestParameters: AdminRealmsRealmRolesByIdRoleIdCompositesRealmGetRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<Array<RoleRepresentation>> {
        const response = await this.adminRealmsRealmRolesByIdRoleIdCompositesRealmGetRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Delete the role
     */
    async adminRealmsRealmRolesByIdRoleIdDeleteRaw(requestParameters: AdminRealmsRealmRolesByIdRoleIdDeleteRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<void>> {
        if (requestParameters['realm'] == null) {
            throw new runtime.RequiredError(
                'realm',
                'Required parameter "realm" was null or undefined when calling adminRealmsRealmRolesByIdRoleIdDelete().'
            );
        }

        if (requestParameters['roleId'] == null) {
            throw new runtime.RequiredError(
                'roleId',
                'Required parameter "roleId" was null or undefined when calling adminRealmsRealmRolesByIdRoleIdDelete().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        const response = await this.request({
            path: `/admin/realms/{realm}/roles-by-id/{role-id}`.replace(`{${"realm"}}`, encodeURIComponent(String(requestParameters['realm']))).replace(`{${"role-id"}}`, encodeURIComponent(String(requestParameters['roleId']))),
            method: 'DELETE',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.VoidApiResponse(response);
    }

    /**
     * Delete the role
     */
    async adminRealmsRealmRolesByIdRoleIdDelete(requestParameters: AdminRealmsRealmRolesByIdRoleIdDeleteRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<void> {
        await this.adminRealmsRealmRolesByIdRoleIdDeleteRaw(requestParameters, initOverrides);
    }

    /**
     * Get a specific role\'s representation
     */
    async adminRealmsRealmRolesByIdRoleIdGetRaw(requestParameters: AdminRealmsRealmRolesByIdRoleIdGetRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<RoleRepresentation>> {
        if (requestParameters['realm'] == null) {
            throw new runtime.RequiredError(
                'realm',
                'Required parameter "realm" was null or undefined when calling adminRealmsRealmRolesByIdRoleIdGet().'
            );
        }

        if (requestParameters['roleId'] == null) {
            throw new runtime.RequiredError(
                'roleId',
                'Required parameter "roleId" was null or undefined when calling adminRealmsRealmRolesByIdRoleIdGet().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        const response = await this.request({
            path: `/admin/realms/{realm}/roles-by-id/{role-id}`.replace(`{${"realm"}}`, encodeURIComponent(String(requestParameters['realm']))).replace(`{${"role-id"}}`, encodeURIComponent(String(requestParameters['roleId']))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => RoleRepresentationFromJSON(jsonValue));
    }

    /**
     * Get a specific role\'s representation
     */
    async adminRealmsRealmRolesByIdRoleIdGet(requestParameters: AdminRealmsRealmRolesByIdRoleIdGetRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<RoleRepresentation> {
        const response = await this.adminRealmsRealmRolesByIdRoleIdGetRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Return object stating whether role Authorization permissions have been initialized or not and a reference
     */
    async adminRealmsRealmRolesByIdRoleIdManagementPermissionsGetRaw(requestParameters: AdminRealmsRealmRolesByIdRoleIdManagementPermissionsGetRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<ManagementPermissionReference>> {
        if (requestParameters['realm'] == null) {
            throw new runtime.RequiredError(
                'realm',
                'Required parameter "realm" was null or undefined when calling adminRealmsRealmRolesByIdRoleIdManagementPermissionsGet().'
            );
        }

        if (requestParameters['roleId'] == null) {
            throw new runtime.RequiredError(
                'roleId',
                'Required parameter "roleId" was null or undefined when calling adminRealmsRealmRolesByIdRoleIdManagementPermissionsGet().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        const response = await this.request({
            path: `/admin/realms/{realm}/roles-by-id/{role-id}/management/permissions`.replace(`{${"realm"}}`, encodeURIComponent(String(requestParameters['realm']))).replace(`{${"role-id"}}`, encodeURIComponent(String(requestParameters['roleId']))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => ManagementPermissionReferenceFromJSON(jsonValue));
    }

    /**
     * Return object stating whether role Authorization permissions have been initialized or not and a reference
     */
    async adminRealmsRealmRolesByIdRoleIdManagementPermissionsGet(requestParameters: AdminRealmsRealmRolesByIdRoleIdManagementPermissionsGetRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<ManagementPermissionReference> {
        const response = await this.adminRealmsRealmRolesByIdRoleIdManagementPermissionsGetRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Return object stating whether role Authorization permissions have been initialized or not and a reference
     */
    async adminRealmsRealmRolesByIdRoleIdManagementPermissionsPutRaw(requestParameters: AdminRealmsRealmRolesByIdRoleIdManagementPermissionsPutRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<ManagementPermissionReference>> {
        if (requestParameters['realm'] == null) {
            throw new runtime.RequiredError(
                'realm',
                'Required parameter "realm" was null or undefined when calling adminRealmsRealmRolesByIdRoleIdManagementPermissionsPut().'
            );
        }

        if (requestParameters['roleId'] == null) {
            throw new runtime.RequiredError(
                'roleId',
                'Required parameter "roleId" was null or undefined when calling adminRealmsRealmRolesByIdRoleIdManagementPermissionsPut().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        const response = await this.request({
            path: `/admin/realms/{realm}/roles-by-id/{role-id}/management/permissions`.replace(`{${"realm"}}`, encodeURIComponent(String(requestParameters['realm']))).replace(`{${"role-id"}}`, encodeURIComponent(String(requestParameters['roleId']))),
            method: 'PUT',
            headers: headerParameters,
            query: queryParameters,
            body: ManagementPermissionReferenceToJSON(requestParameters['managementPermissionReference']),
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => ManagementPermissionReferenceFromJSON(jsonValue));
    }

    /**
     * Return object stating whether role Authorization permissions have been initialized or not and a reference
     */
    async adminRealmsRealmRolesByIdRoleIdManagementPermissionsPut(requestParameters: AdminRealmsRealmRolesByIdRoleIdManagementPermissionsPutRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<ManagementPermissionReference> {
        const response = await this.adminRealmsRealmRolesByIdRoleIdManagementPermissionsPutRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Update the role
     */
    async adminRealmsRealmRolesByIdRoleIdPutRaw(requestParameters: AdminRealmsRealmRolesByIdRoleIdPutRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<void>> {
        if (requestParameters['realm'] == null) {
            throw new runtime.RequiredError(
                'realm',
                'Required parameter "realm" was null or undefined when calling adminRealmsRealmRolesByIdRoleIdPut().'
            );
        }

        if (requestParameters['roleId'] == null) {
            throw new runtime.RequiredError(
                'roleId',
                'Required parameter "roleId" was null or undefined when calling adminRealmsRealmRolesByIdRoleIdPut().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        const response = await this.request({
            path: `/admin/realms/{realm}/roles-by-id/{role-id}`.replace(`{${"realm"}}`, encodeURIComponent(String(requestParameters['realm']))).replace(`{${"role-id"}}`, encodeURIComponent(String(requestParameters['roleId']))),
            method: 'PUT',
            headers: headerParameters,
            query: queryParameters,
            body: RoleRepresentationToJSON(requestParameters['roleRepresentation']),
        }, initOverrides);

        return new runtime.VoidApiResponse(response);
    }

    /**
     * Update the role
     */
    async adminRealmsRealmRolesByIdRoleIdPut(requestParameters: AdminRealmsRealmRolesByIdRoleIdPutRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<void> {
        await this.adminRealmsRealmRolesByIdRoleIdPutRaw(requestParameters, initOverrides);
    }

}