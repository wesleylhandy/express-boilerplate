import { Model } from "./model";
import bcrypt from 'bcrypt';
import { IUsersDao } from "./i-users-dao";
import { Db, Document, Filter, MongoClient, ObjectId, WithId } from "mongodb";
import { Logger } from "winston";
import { isPresent } from '@perfective/common'
import { MongoDbQueryResponse } from "./query-response";
import { User } from "./user.";
import { saltPassword } from "../utils/salt";
import { Collections } from "../contants/collections";

class UsersDAO extends Model implements IUsersDao {

    constructor(db: Db, collectionName: string, logger: Logger) {
      super(db, collectionName, logger);
      if (!(this instanceof UsersDAO)) {
        return new UsersDAO(db, collectionName, logger);
      }
      this.logger = logger;
      this.indexes = [
        {
          key: {
            "roles.role": 1
          },
          name: "Role"
        },
        {
          key: {
            "devices.id": 1
          },
          name: "Devices"
        },
        {
          key: {
            username: 1
          },
          name: "UserName",
          unique: true,
          background: true
        },
        {
          key: {
            companyID: 1
          },
          name: "CompanyID"
        },
        {
          key: {
            "emails.value": 1
          },
          name: "Email"
        },
        {
          key: {
            dateAdded: -1
          },
          name: "DateAddedToDB"
        }
      ];
      this.createIndexes();
    }
  
    getUser = async (query: Filter<Document> = {}): Promise<MongoDbQueryResponse<WithId<Document>>> => {
      try {
        const user = await this.collection.findOne(query);
        if (user) {
            return { success: true, error: null, value: user };
        }
        throw new Error('No User Found');
      } catch (error: unknown) {
        return { success: false, error: error as Error, value: null };
      }
    }
  
    addUser = async (username: string, password: string): Promise<MongoDbQueryResponse<{ id: ObjectId; }>> => {
      const user = new User({ username });
      try {
        user.password = await saltPassword(password, this.logger);
        try {
          const { insertedId } = await this.collection.insertOne(user, {
            fullResponse: true
          });
          return {
            success: true,
            value: { id: insertedId },
            error: null,
          };
        } catch (error: unknown) {
          throw error as Error;
        }
      } catch (error: unknown) {
        return {
          success: false,
          value: null,
          error: error as Error,
        };
      }
    }
  
    async comparePassword(candidatePassword: string, dbPassword: string): Promise<boolean> {
      try {
        return bcrypt.compare(candidatePassword, dbPassword);
      } catch (err: unknown) {
        throw err as Error;
      }
    }
}
  
export const getUsersDAO = async (connection: MongoClient, dbName: string, logger: Logger) => {
    const db = connection.db(dbName);
    if (isPresent(db)) {
        return new UsersDAO(db, Collections.User, logger);
    } 
    throw new Error(`Unable to Connect to ${Collections.User} Collection`);
};
  