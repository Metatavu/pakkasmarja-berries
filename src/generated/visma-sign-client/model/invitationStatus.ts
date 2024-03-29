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
import { InvitationStatusDocument } from './invitationStatusDocument';

export class InvitationStatus {
    'uuid'?: string;
    'status'?: InvitationStatus.StatusEnum;
    'document'?: InvitationStatusDocument;

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
            "type": "InvitationStatus.StatusEnum"
        },
        {
            "name": "document",
            "baseName": "document",
            "type": "InvitationStatusDocument"
        }    ];

    static getAttributeTypeMap() {
        return InvitationStatus.attributeTypeMap;
    }
}

export namespace InvitationStatus {
    export enum StatusEnum {
        WaitingForSend = <any> 'waiting-for-send',
        Sending = <any> 'sending',
        New = <any> 'new',
        Opened = <any> 'opened',
        Signed = <any> 'signed',
        Cancelled = <any> 'cancelled'
    }
}
