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


export interface ChatThread { 
    id: number  | null;
    title: string ;
    type: string  | null;
    originId: string  | null;
    imageUrl: string  | null;
    answerType: ChatThread.AnswerTypeEnum ;
}    

export interface ChatThreadOpt { 
    id?: number;
    title?: string;
    type?: string;
    originId?: string;
    imageUrl?: string;
    answerType?: ChatThread.AnswerTypeEnum;
}
export namespace ChatThread {
    export type AnswerTypeEnum = 'TEXT' | 'POLL';
    export const AnswerTypeEnum = {
        TEXT: 'TEXT' as AnswerTypeEnum,
        POLL: 'POLL' as AnswerTypeEnum
    };
}