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
import { DocumentStatus } from './documentStatus';

export class DocumentSearchResult {
    'total'?: number;
    'offset'?: number;
    'length'?: number;
    'documents'?: Array<DocumentStatus>;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "total",
            "baseName": "total",
            "type": "number"
        },
        {
            "name": "offset",
            "baseName": "offset",
            "type": "number"
        },
        {
            "name": "length",
            "baseName": "length",
            "type": "number"
        },
        {
            "name": "documents",
            "baseName": "documents",
            "type": "Array<DocumentStatus>"
        }    ];

    static getAttributeTypeMap() {
        return DocumentSearchResult.attributeTypeMap;
    }
}

