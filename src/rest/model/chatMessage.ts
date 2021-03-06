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


export interface ChatMessage { 
    id: number  | null;
    threadId: number ;
    userId: string  | null;
    image: string  | null;
    contents: string  | null;
    readonly createdAt: Date  | null;
    readonly updatedAt: Date  | null;
}    

export interface ChatMessageOpt { 
    id?: number;
    threadId?: number;
    userId?: string;
    image?: string;
    contents?: string;
    readonly createdAt?: Date;
    readonly updatedAt?: Date;
}
