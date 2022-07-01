import { extend } from "@hapi/joi"

interface BaseMongoDbRepsonse<ResponseType = unknown> {
    success: true | false;
    value?: ResponseType | null;
    error?: Error | null;
}

export interface MongoDbSuccessResponse<ResponseType = unknown> extends BaseMongoDbRepsonse<ResponseType> {
    success: true;
    value: ResponseType;
    error?: null; 
}

export interface MongoDbErrorResponse<ResponseType = unknown> extends BaseMongoDbRepsonse<ResponseType> {
    success: false;
    value: null;
    error: Error;
}

export type MongoDbQueryResponse<ResponseType = unknown> = MongoDbSuccessResponse<ResponseType> | MongoDbErrorResponse<ResponseType>;