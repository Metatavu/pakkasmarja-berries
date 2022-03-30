/**
 * Pakkasmarja ERP services
 * No description provided (generated by Openapi Generator https://github.com/openapitools/openapi-generator)
 *
 * The version of the OpenAPI document: 1.0.0
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { RequestFile } from './models';

export class SapBankAccount {
    'bIC'?: string;
    'iBAN'?: string;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "bIC",
            "baseName": "BIC",
            "type": "string"
        },
        {
            "name": "iBAN",
            "baseName": "IBAN",
            "type": "string"
        }    ];

    static getAttributeTypeMap() {
        return SapBankAccount.attributeTypeMap;
    }
}
