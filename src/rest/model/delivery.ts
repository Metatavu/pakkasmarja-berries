/**
 * Pakkasmarja REST API
 * REST API for Pakkasmarja
 *
 * OpenAPI spec version: 3.0.0
 * 
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 * Do not edit the class manually.
 */
import { DeliveryLoan } from './deliveryLoan';
import { DeliveryStatus } from './deliveryStatus';


export interface Delivery { 
    id: string  | null;
    productId: string ;
    userId: string ;
    time: Date ;
    status: DeliveryStatus ;
    amount: number ;
    /**
     * Base price without quality bonus
     */
    price: string  | null;
    qualityId: string  | null;
    deliveryPlaceId: string ;
    warehouseCode: string  | null;
    /**
     * Array of loans. Property is write only
     */
    loans: Array<DeliveryLoan>  | null;
}    

export interface DeliveryOpt { 
    id?: string;
    productId?: string;
    userId?: string;
    time?: Date;
    status?: DeliveryStatus;
    amount?: number;
    /**
     * Base price without quality bonus
     */
    price?: string;
    qualityId?: string;
    deliveryPlaceId?: string;
    warehouseCode?: string;
    /**
     * Array of loans. Property is write only
     */
    loans?: Array<DeliveryLoan>;
}
