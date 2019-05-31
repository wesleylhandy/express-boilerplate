const mongodb = require('mongodb');

"use strict";
class Model {

    constructor(db, collectionName) {
        this.db = db;
        this.collectionName = collectionName
        this.collection = db.collection(collectionName);
        this.indexes = [];
    }

    async createIndexes() {
        const { indexes, collectionName } = this
        if (indexes.length) {
            try {
                const result = await this.collection.createIndexes(indexes)
                console.log({ [collectionName]: { CreateIndexesResult: result } })
            } catch (err) {
                console.log("Create Index Error")
                console.error(JSON.stringify(err, null, 2))
            }
        }
    }

    /**
     * Returns all documents in a collection
     * @param {string} type - name of the type of documents being retrieved
     * @returns {Object} - flagged as boolean success with either docs or error 
     */
    async getAll(type) {
        const cursor = this.collection.find({});
        try {
            const docs = await cursor.toArray()
            return { success: true, [type]: docs }
        } catch (err) {
            return { success: false, err }
        }
    }
    
    async getCount(){
        try {
            const count = await this.collection.countDocuments({})
            return count;
        } catch (err) {
            throw new Error(err)
        }
    }

    async removeOne(record) {
        try {
            this.collection.deleteOne({ record })
        } catch (err) {
            console.log("Delete One Error")
            console.error(JSON.stringify(err, null, 2))
            return { success: false, err}
        }
        return { success: true }
    }
}

module.exports =  Model