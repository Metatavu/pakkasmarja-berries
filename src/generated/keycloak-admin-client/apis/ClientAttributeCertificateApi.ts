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
  CertificateRepresentation,
  KeyStoreConfig,
} from '../models/index';
import {
    CertificateRepresentationFromJSON,
    CertificateRepresentationToJSON,
    KeyStoreConfigFromJSON,
    KeyStoreConfigToJSON,
} from '../models/index';

export interface AdminRealmsRealmClientsClientUuidCertificatesAttrDownloadPostRequest {
    realm: string;
    clientUuid: string;
    attr: string;
    keyStoreConfig?: KeyStoreConfig;
}

export interface AdminRealmsRealmClientsClientUuidCertificatesAttrGenerateAndDownloadPostRequest {
    realm: string;
    clientUuid: string;
    attr: string;
    keyStoreConfig?: KeyStoreConfig;
}

export interface AdminRealmsRealmClientsClientUuidCertificatesAttrGeneratePostRequest {
    realm: string;
    clientUuid: string;
    attr: string;
}

export interface AdminRealmsRealmClientsClientUuidCertificatesAttrGetRequest {
    realm: string;
    clientUuid: string;
    attr: string;
}

export interface AdminRealmsRealmClientsClientUuidCertificatesAttrUploadCertificatePostRequest {
    realm: string;
    clientUuid: string;
    attr: string;
}

export interface AdminRealmsRealmClientsClientUuidCertificatesAttrUploadPostRequest {
    realm: string;
    clientUuid: string;
    attr: string;
}

/**
 * 
 */
export class ClientAttributeCertificateApi extends runtime.BaseAPI {

    /**
     * Get a keystore file for the client, containing private key and public certificate
     */
    async adminRealmsRealmClientsClientUuidCertificatesAttrDownloadPostRaw(requestParameters: AdminRealmsRealmClientsClientUuidCertificatesAttrDownloadPostRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<Blob>> {
        if (requestParameters['realm'] == null) {
            throw new runtime.RequiredError(
                'realm',
                'Required parameter "realm" was null or undefined when calling adminRealmsRealmClientsClientUuidCertificatesAttrDownloadPost().'
            );
        }

        if (requestParameters['clientUuid'] == null) {
            throw new runtime.RequiredError(
                'clientUuid',
                'Required parameter "clientUuid" was null or undefined when calling adminRealmsRealmClientsClientUuidCertificatesAttrDownloadPost().'
            );
        }

        if (requestParameters['attr'] == null) {
            throw new runtime.RequiredError(
                'attr',
                'Required parameter "attr" was null or undefined when calling adminRealmsRealmClientsClientUuidCertificatesAttrDownloadPost().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        const response = await this.request({
            path: `/admin/realms/{realm}/clients/{client-uuid}/certificates/{attr}/download`.replace(`{${"realm"}}`, encodeURIComponent(String(requestParameters['realm']))).replace(`{${"client-uuid"}}`, encodeURIComponent(String(requestParameters['clientUuid']))).replace(`{${"attr"}}`, encodeURIComponent(String(requestParameters['attr']))),
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
            body: KeyStoreConfigToJSON(requestParameters['keyStoreConfig']),
        }, initOverrides);

        return new runtime.BlobApiResponse(response);
    }

    /**
     * Get a keystore file for the client, containing private key and public certificate
     */
    async adminRealmsRealmClientsClientUuidCertificatesAttrDownloadPost(requestParameters: AdminRealmsRealmClientsClientUuidCertificatesAttrDownloadPostRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<Blob> {
        const response = await this.adminRealmsRealmClientsClientUuidCertificatesAttrDownloadPostRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Generate a new keypair and certificate, and get the private key file  Generates a keypair and certificate and serves the private key in a specified keystore format. Only generated public certificate is saved in Keycloak DB - the private key is not.
     */
    async adminRealmsRealmClientsClientUuidCertificatesAttrGenerateAndDownloadPostRaw(requestParameters: AdminRealmsRealmClientsClientUuidCertificatesAttrGenerateAndDownloadPostRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<Blob>> {
        if (requestParameters['realm'] == null) {
            throw new runtime.RequiredError(
                'realm',
                'Required parameter "realm" was null or undefined when calling adminRealmsRealmClientsClientUuidCertificatesAttrGenerateAndDownloadPost().'
            );
        }

        if (requestParameters['clientUuid'] == null) {
            throw new runtime.RequiredError(
                'clientUuid',
                'Required parameter "clientUuid" was null or undefined when calling adminRealmsRealmClientsClientUuidCertificatesAttrGenerateAndDownloadPost().'
            );
        }

        if (requestParameters['attr'] == null) {
            throw new runtime.RequiredError(
                'attr',
                'Required parameter "attr" was null or undefined when calling adminRealmsRealmClientsClientUuidCertificatesAttrGenerateAndDownloadPost().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        const response = await this.request({
            path: `/admin/realms/{realm}/clients/{client-uuid}/certificates/{attr}/generate-and-download`.replace(`{${"realm"}}`, encodeURIComponent(String(requestParameters['realm']))).replace(`{${"client-uuid"}}`, encodeURIComponent(String(requestParameters['clientUuid']))).replace(`{${"attr"}}`, encodeURIComponent(String(requestParameters['attr']))),
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
            body: KeyStoreConfigToJSON(requestParameters['keyStoreConfig']),
        }, initOverrides);

        return new runtime.BlobApiResponse(response);
    }

    /**
     * Generate a new keypair and certificate, and get the private key file  Generates a keypair and certificate and serves the private key in a specified keystore format. Only generated public certificate is saved in Keycloak DB - the private key is not.
     */
    async adminRealmsRealmClientsClientUuidCertificatesAttrGenerateAndDownloadPost(requestParameters: AdminRealmsRealmClientsClientUuidCertificatesAttrGenerateAndDownloadPostRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<Blob> {
        const response = await this.adminRealmsRealmClientsClientUuidCertificatesAttrGenerateAndDownloadPostRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Generate a new certificate with new key pair
     */
    async adminRealmsRealmClientsClientUuidCertificatesAttrGeneratePostRaw(requestParameters: AdminRealmsRealmClientsClientUuidCertificatesAttrGeneratePostRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<CertificateRepresentation>> {
        if (requestParameters['realm'] == null) {
            throw new runtime.RequiredError(
                'realm',
                'Required parameter "realm" was null or undefined when calling adminRealmsRealmClientsClientUuidCertificatesAttrGeneratePost().'
            );
        }

        if (requestParameters['clientUuid'] == null) {
            throw new runtime.RequiredError(
                'clientUuid',
                'Required parameter "clientUuid" was null or undefined when calling adminRealmsRealmClientsClientUuidCertificatesAttrGeneratePost().'
            );
        }

        if (requestParameters['attr'] == null) {
            throw new runtime.RequiredError(
                'attr',
                'Required parameter "attr" was null or undefined when calling adminRealmsRealmClientsClientUuidCertificatesAttrGeneratePost().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        const response = await this.request({
            path: `/admin/realms/{realm}/clients/{client-uuid}/certificates/{attr}/generate`.replace(`{${"realm"}}`, encodeURIComponent(String(requestParameters['realm']))).replace(`{${"client-uuid"}}`, encodeURIComponent(String(requestParameters['clientUuid']))).replace(`{${"attr"}}`, encodeURIComponent(String(requestParameters['attr']))),
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => CertificateRepresentationFromJSON(jsonValue));
    }

    /**
     * Generate a new certificate with new key pair
     */
    async adminRealmsRealmClientsClientUuidCertificatesAttrGeneratePost(requestParameters: AdminRealmsRealmClientsClientUuidCertificatesAttrGeneratePostRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<CertificateRepresentation> {
        const response = await this.adminRealmsRealmClientsClientUuidCertificatesAttrGeneratePostRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Get key info
     */
    async adminRealmsRealmClientsClientUuidCertificatesAttrGetRaw(requestParameters: AdminRealmsRealmClientsClientUuidCertificatesAttrGetRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<CertificateRepresentation>> {
        if (requestParameters['realm'] == null) {
            throw new runtime.RequiredError(
                'realm',
                'Required parameter "realm" was null or undefined when calling adminRealmsRealmClientsClientUuidCertificatesAttrGet().'
            );
        }

        if (requestParameters['clientUuid'] == null) {
            throw new runtime.RequiredError(
                'clientUuid',
                'Required parameter "clientUuid" was null or undefined when calling adminRealmsRealmClientsClientUuidCertificatesAttrGet().'
            );
        }

        if (requestParameters['attr'] == null) {
            throw new runtime.RequiredError(
                'attr',
                'Required parameter "attr" was null or undefined when calling adminRealmsRealmClientsClientUuidCertificatesAttrGet().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        const response = await this.request({
            path: `/admin/realms/{realm}/clients/{client-uuid}/certificates/{attr}`.replace(`{${"realm"}}`, encodeURIComponent(String(requestParameters['realm']))).replace(`{${"client-uuid"}}`, encodeURIComponent(String(requestParameters['clientUuid']))).replace(`{${"attr"}}`, encodeURIComponent(String(requestParameters['attr']))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => CertificateRepresentationFromJSON(jsonValue));
    }

    /**
     * Get key info
     */
    async adminRealmsRealmClientsClientUuidCertificatesAttrGet(requestParameters: AdminRealmsRealmClientsClientUuidCertificatesAttrGetRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<CertificateRepresentation> {
        const response = await this.adminRealmsRealmClientsClientUuidCertificatesAttrGetRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Upload only certificate, not private key
     */
    async adminRealmsRealmClientsClientUuidCertificatesAttrUploadCertificatePostRaw(requestParameters: AdminRealmsRealmClientsClientUuidCertificatesAttrUploadCertificatePostRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<CertificateRepresentation>> {
        if (requestParameters['realm'] == null) {
            throw new runtime.RequiredError(
                'realm',
                'Required parameter "realm" was null or undefined when calling adminRealmsRealmClientsClientUuidCertificatesAttrUploadCertificatePost().'
            );
        }

        if (requestParameters['clientUuid'] == null) {
            throw new runtime.RequiredError(
                'clientUuid',
                'Required parameter "clientUuid" was null or undefined when calling adminRealmsRealmClientsClientUuidCertificatesAttrUploadCertificatePost().'
            );
        }

        if (requestParameters['attr'] == null) {
            throw new runtime.RequiredError(
                'attr',
                'Required parameter "attr" was null or undefined when calling adminRealmsRealmClientsClientUuidCertificatesAttrUploadCertificatePost().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        const response = await this.request({
            path: `/admin/realms/{realm}/clients/{client-uuid}/certificates/{attr}/upload-certificate`.replace(`{${"realm"}}`, encodeURIComponent(String(requestParameters['realm']))).replace(`{${"client-uuid"}}`, encodeURIComponent(String(requestParameters['clientUuid']))).replace(`{${"attr"}}`, encodeURIComponent(String(requestParameters['attr']))),
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => CertificateRepresentationFromJSON(jsonValue));
    }

    /**
     * Upload only certificate, not private key
     */
    async adminRealmsRealmClientsClientUuidCertificatesAttrUploadCertificatePost(requestParameters: AdminRealmsRealmClientsClientUuidCertificatesAttrUploadCertificatePostRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<CertificateRepresentation> {
        const response = await this.adminRealmsRealmClientsClientUuidCertificatesAttrUploadCertificatePostRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Upload certificate and eventually private key
     */
    async adminRealmsRealmClientsClientUuidCertificatesAttrUploadPostRaw(requestParameters: AdminRealmsRealmClientsClientUuidCertificatesAttrUploadPostRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<CertificateRepresentation>> {
        if (requestParameters['realm'] == null) {
            throw new runtime.RequiredError(
                'realm',
                'Required parameter "realm" was null or undefined when calling adminRealmsRealmClientsClientUuidCertificatesAttrUploadPost().'
            );
        }

        if (requestParameters['clientUuid'] == null) {
            throw new runtime.RequiredError(
                'clientUuid',
                'Required parameter "clientUuid" was null or undefined when calling adminRealmsRealmClientsClientUuidCertificatesAttrUploadPost().'
            );
        }

        if (requestParameters['attr'] == null) {
            throw new runtime.RequiredError(
                'attr',
                'Required parameter "attr" was null or undefined when calling adminRealmsRealmClientsClientUuidCertificatesAttrUploadPost().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        const response = await this.request({
            path: `/admin/realms/{realm}/clients/{client-uuid}/certificates/{attr}/upload`.replace(`{${"realm"}}`, encodeURIComponent(String(requestParameters['realm']))).replace(`{${"client-uuid"}}`, encodeURIComponent(String(requestParameters['clientUuid']))).replace(`{${"attr"}}`, encodeURIComponent(String(requestParameters['attr']))),
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => CertificateRepresentationFromJSON(jsonValue));
    }

    /**
     * Upload certificate and eventually private key
     */
    async adminRealmsRealmClientsClientUuidCertificatesAttrUploadPost(requestParameters: AdminRealmsRealmClientsClientUuidCertificatesAttrUploadPostRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<CertificateRepresentation> {
        const response = await this.adminRealmsRealmClientsClientUuidCertificatesAttrUploadPostRaw(requestParameters, initOverrides);
        return await response.value();
    }

}
