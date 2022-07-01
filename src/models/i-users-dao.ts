import { IModel } from "./i-model";
import { Document, Filter, ObjectId, WithId } from 'mongodb'
import { MongoDbQueryResponse } from './query-response';

export interface IUsersDao extends IModel {
    addUser(username: string, password: string): Promise<MongoDbQueryResponse<{ id: ObjectId; }>>;
    getUser(query?: Filter<Document>): Promise<MongoDbQueryResponse<WithId<Document>>>;
    comparePassword(candidatePassword: string, dbPassword: string): Promise<boolean>;
}