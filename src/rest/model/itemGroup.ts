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


export interface ItemGroup { 
    id: string  | null;
    name: string  | null;
    displayName: string  | null;
    category: string  | null;
    minimumProfitEstimation: number  | null;
    /**
     * Require contract in specified item group before siging a contract
     */
    prerequisiteContractItemGroupId: string  | null;
}    

export interface ItemGroupOpt { 
    id?: string;
    name?: string;
    displayName?: string;
    category?: string;
    minimumProfitEstimation?: number;
    /**
     * Require contract in specified item group before siging a contract
     */
    prerequisiteContractItemGroupId?: string;
}