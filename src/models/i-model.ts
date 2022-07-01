import { Collection, Db, Document, IndexDescription, Filter } from 'mongodb'
import { MongoDbQueryResponse } from './query-response';

export interface IModel {
    getAll(type: string): Promise<MongoDbQueryResponse>;
    getCount(): Promise<number>;
    removeOne(record: Filter<Document>): Promise<MongoDbQueryResponse>;
}