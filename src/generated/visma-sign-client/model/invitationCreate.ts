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
import { InvitationCreateInviter } from './invitationCreateInviter';
import { InvitationCreateMessages } from './invitationCreateMessages';
import { InvitationCreateOrder } from './invitationCreateOrder';

export class InvitationCreate {
    'email'?: string;
    'identifierType'?: string;
    'identifier'?: string;
    'sms'?: string;
    'signAsOrganization'?: boolean;
    'language'?: InvitationCreate.LanguageEnum;
    'messages'?: InvitationCreateMessages;
    'inviter'?: InvitationCreateInviter;
    'order'?: InvitationCreateOrder;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "email",
            "baseName": "email",
            "type": "string"
        },
        {
            "name": "identifierType",
            "baseName": "identifier_type",
            "type": "string"
        },
        {
            "name": "identifier",
            "baseName": "identifier",
            "type": "string"
        },
        {
            "name": "sms",
            "baseName": "sms",
            "type": "string"
        },
        {
            "name": "signAsOrganization",
            "baseName": "sign_as_organization",
            "type": "boolean"
        },
        {
            "name": "language",
            "baseName": "language",
            "type": "InvitationCreate.LanguageEnum"
        },
        {
            "name": "messages",
            "baseName": "messages",
            "type": "InvitationCreateMessages"
        },
        {
            "name": "inviter",
            "baseName": "inviter",
            "type": "InvitationCreateInviter"
        },
        {
            "name": "order",
            "baseName": "order",
            "type": "InvitationCreateOrder"
        }    ];

    static getAttributeTypeMap() {
        return InvitationCreate.attributeTypeMap;
    }
}

export namespace InvitationCreate {
    export enum LanguageEnum {
        Fi = <any> 'fi',
        Sv = <any> 'sv',
        En = <any> 'en',
        Nb = <any> 'nb',
        Da = <any> 'da'
    }
}