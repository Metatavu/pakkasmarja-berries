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
import { OperationType } from './operationType';


export interface OperationReport { 
    id: string  | null;
    type: OperationType  | null;
    started: Date  | null;
    pendingCount: number  | null;
    failedCount: number  | null;
    successCount: number  | null;
}    

export interface OperationReportOpt { 
    id?: string;
    type?: OperationType;
    started?: Date;
    pendingCount?: number;
    failedCount?: number;
    successCount?: number;
}
