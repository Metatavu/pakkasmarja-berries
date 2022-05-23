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

export class SavedSmsMessage {
    'uuid'?: string;
    'message'?: string;
    'editedOn'?: string;
    'editedBy'?: string;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "uuid",
            "baseName": "uuid",
            "type": "string"
        },
        {
            "name": "message",
            "baseName": "message",
            "type": "string"
        },
        {
            "name": "editedOn",
            "baseName": "edited_on",
            "type": "string"
        },
        {
            "name": "editedBy",
            "baseName": "edited_by",
            "type": "string"
        }    ];

    static getAttributeTypeMap() {
        return SavedSmsMessage.attributeTypeMap;
    }
}

