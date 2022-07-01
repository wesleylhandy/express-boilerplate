import { Collection, Db, IndexDescription, Filter, Document, WithId } from 'mongodb'
import { Logger } from 'winston';
import { IModel } from './i-model';
import { MongoDbQueryResponse } from './query-response';

export class Model implements IModel {
    private _db: Db;
    private _collectionName: string = '';
    private _collection: Collection;
    private _indexes: IndexDescription[] = [];
    private _logger: Logger;

    public constructor(db: Db, collectionName: string, logger: Logger) {
        this._db = db;
        this._collection = db.collection(collectionName);
        this._collectionName = collectionName;
        this._logger = logger;
    }

    protected get db() {
        return this._db;
    }

    protected get collection() {
        return this._collection;
    }

    protected get indexes() {
        return this._indexes;
    }

    protected set indexes(indexes: IndexDescription[]) {
        this._indexes = indexes ?? [];
    }

    public set logger(logger: Logger) {
        this._logger = logger;
    }

    public get logger() {
        return this._logger;
    }

    protected createIndexes = async (): Promise<void> => {
        if (this._indexes.length) {
            try {
                const result = await this._collection.createIndexes(this._indexes)
                this._logger.log('info', JSON.stringify({ [this._collectionName]: { CreateIndexesResult: result } }, null, 5))
            } catch (err) {
                this._logger.log('error', "Create Index Error")
                this._logger.log('error', JSON.stringify(err, null, 5))
            }
        }
    }

    /**
     * Returns all documents in a collection
     * @param {string} type - name of the type of documents being retrieved
     * @returns {Object} - flagged as boolean success with either docs or error 
     */
    public getAll = async (type: string): Promise<MongoDbQueryResponse> => {
        const cursor = this.collection.find({});
        try {
            const docs = await cursor.toArray()
            return {
                success: true,
                value: {
                    [type]: docs
                },
                error: null,
            }
        } catch (error) {
            return { success: false, error: error as Error, value: null }
        }
    }
    
    public getCount = async (): Promise<number> => {
        const count = await this._collection.countDocuments({})
        return count;
    }

    public removeOne = async (record: Filter<Document>): Promise<MongoDbQueryResponse> => {
        try {
            this._collection.deleteOne({ record })
        } catch (error: unknown) {
            this._logger.log('error', "Delete One Error")
            this._logger.log('error', JSON.stringify(error, null, 5))
            return { success: false, error: error as Error, value: null }
        }
        return { success: true, error: null, value: null }
    }
}
