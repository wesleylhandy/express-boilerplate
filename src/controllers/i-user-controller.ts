import { MongoClient } from "mongodb";
import { IUsersDao } from "../models/i-users-dao";

export interface IUserController {
    connection?: MongoClient;
    usersDao?: IUsersDao;
}