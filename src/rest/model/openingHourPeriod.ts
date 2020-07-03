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
import { OpeningHourWeekday } from './openingHourWeekday';


export interface OpeningHourPeriod { 
    id: string  | null;
    beginDate: Date ;
    endDate: Date ;
    weekdays: Array<OpeningHourWeekday> ;
}    

export interface OpeningHourPeriodOpt { 
    id?: string;
    beginDate?: Date;
    endDate?: Date;
    weekdays?: Array<OpeningHourWeekday>;
}
