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

export class InvitationCreateMessages {
    'sendInvitationEmail'?: boolean;
    'invitationEmailMessage'?: string;
    'sendInvitationSms'?: boolean;
    'customSms'?: string;
    'separateInviteParts'?: boolean;
    'sendInviteeAllCollectedEmail'?: boolean;
    'sendInviterOneCollectedEmails'?: boolean;
    'attachmentAllowed'?: boolean;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "sendInvitationEmail",
            "baseName": "send_invitation_email",
            "type": "boolean"
        },
        {
            "name": "invitationEmailMessage",
            "baseName": "invitation_email_message",
            "type": "string"
        },
        {
            "name": "sendInvitationSms",
            "baseName": "send_invitation_sms",
            "type": "boolean"
        },
        {
            "name": "customSms",
            "baseName": "custom_sms",
            "type": "string"
        },
        {
            "name": "separateInviteParts",
            "baseName": "separate_invite_parts",
            "type": "boolean"
        },
        {
            "name": "sendInviteeAllCollectedEmail",
            "baseName": "send_invitee_all_collected_email",
            "type": "boolean"
        },
        {
            "name": "sendInviterOneCollectedEmails",
            "baseName": "send_inviter_one_collected_emails",
            "type": "boolean"
        },
        {
            "name": "attachmentAllowed",
            "baseName": "attachment_allowed",
            "type": "boolean"
        }    ];

    static getAttributeTypeMap() {
        return InvitationCreateMessages.attributeTypeMap;
    }
}

