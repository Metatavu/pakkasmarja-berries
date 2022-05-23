/**
 * Visma-Sign API
 * Swagger documentation for Visma-Sign API.
 *
 * The version of the OpenAPI document: 0.0.1
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { RequestFile } from './models';

export class InvitationCreateResponse {
    'uuid'?: string;
    'status'?: InvitationCreateResponse.StatusEnum;
    'passphrase'?: string;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "uuid",
            "baseName": "uuid",
            "type": "string"
        },
        {
            "name": "status",
            "baseName": "status",
            "type": "InvitationCreateResponse.StatusEnum"
        },
        {
            "name": "passphrase",
            "baseName": "passphrase",
            "type": "string"
        }    ];

    static getAttributeTypeMap() {
        return InvitationCreateResponse.attributeTypeMap;
    }
}

export namespace InvitationCreateResponse {
    export enum StatusEnum {
        WaitingForSend = <any> 'waiting-for-send',
        Sending = <any> 'sending',
        New = <any> 'new',
        Opened = <any> 'opened',
        Signed = <any> 'signed',
        Cancelled = <any> 'cancelled'
    }
}