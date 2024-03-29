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
import { SapStockTransferLine } from './sapStockTransferLine';

export class SapStockTransfer {
    'docDate': string;
    /**
    * SAP business partner code.
    */
    'businessPartnerCode': number;
    'comments'?: string;
    /**
    * SAP sales person code.
    */
    'salesPersonCode': number;
    /**
    * SAP warehouse code.
    */
    'fromWarehouse': string;
    /**
    * SAP warehouse code.
    */
    'toWarehouse': string;
    'lines': Array<SapStockTransferLine>;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "docDate",
            "baseName": "docDate",
            "type": "string"
        },
        {
            "name": "businessPartnerCode",
            "baseName": "businessPartnerCode",
            "type": "number"
        },
        {
            "name": "comments",
            "baseName": "comments",
            "type": "string"
        },
        {
            "name": "salesPersonCode",
            "baseName": "salesPersonCode",
            "type": "number"
        },
        {
            "name": "fromWarehouse",
            "baseName": "fromWarehouse",
            "type": "string"
        },
        {
            "name": "toWarehouse",
            "baseName": "toWarehouse",
            "type": "string"
        },
        {
            "name": "lines",
            "baseName": "lines",
            "type": "Array<SapStockTransferLine>"
        }    ];

    static getAttributeTypeMap() {
        return SapStockTransfer.attributeTypeMap;
    }
}

