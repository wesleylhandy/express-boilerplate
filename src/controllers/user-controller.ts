import { EnvVars, valueFromEnvironment } from '../utils/environment-variables';
import { Logger } from 'winston';
import { isAbsent } from '@perfective/common';
import { connectToMongoDB } from '../loaders/mongo-connect';
import { getUsersDAO } from '../models/users-dao';
import { MongoClient } from "mongodb";
import { IUserController } from './i-user-controller';
import { IUsersDao } from '../models/i-users-dao';
import { Collections } from '../contants/collections';

export class UserController implements IUserController {
    private _dbName: string = valueFromEnvironment(EnvVars.DBNAME) ?? 'local_dev';
    private _logger: Logger;
    private _workerId: number;
    private _connection?: MongoClient;
    private _usersDao?: IUsersDao;

    public constructor(logger: Logger, workerId: number) {
        this._logger = logger;
        this._workerId = workerId;
        this.connect();
    }

    public get connection() {
      return this._connection;
    }
    
    public get usersDao() {
      return this._usersDao;
    }

    protected connect = async () => {
      try {
        this._connection = await connectToMongoDB(this._dbName);
        this._usersDao = await this.getUsersDao();
        this._logger.log('info', `Connected to DB: ${this._dbName}`);

      } catch (error) {
        this._logger.log('error', `MongoDB Connection Error on DB ${this._dbName}, Collection: ${Collections.User}: ${JSON.stringify(error, null, 5)}`);
        typeof process.send !== 'undefined' && process.send(`DB Connection Error on ${this._workerId}.`);
      }
    }

    protected async getUsersDao() {
      try {
        if (isAbsent(this._connection)) {
          throw new Error('Connection to MongoDB failed');
        }
        return await getUsersDAO(this._connection, this._dbName, this._logger);

      } catch (error) {
        throw error as Error;
      }
    }


}