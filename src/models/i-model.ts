import { Document, Filter, ObjectId } from 'mongodb'
import { MongoDbQueryResponse } from './query-response';

export interface IModel {
    getAll(type: string): Promise<MongoDbQueryResponse>;
    getCount(): Promise<number>;
    removeOne(record: Filter<Document>): Promise<MongoDbQueryResponse>;
    validateId(id: Parameters<typeof ObjectId.isValid>[0]): boolean;
}