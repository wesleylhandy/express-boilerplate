import { MongoClient } from "mongodb";

export const connectToMongoDB = async (dbname = "test") => {
  const uri =
    process.env.MONGODB_CONNECT_STRING || `mongodb://localhost:27017/${dbname}`;
  const mongoClient = new MongoClient(uri);
  try {
    const connection = await mongoClient.connect();
    if (connection instanceof MongoClient) {
      return connection;
    } else {
      throw new Error('Unable to Connect to MongoDB');
    }
  } catch (error: unknown) {
    throw error as Error;
  }
};
