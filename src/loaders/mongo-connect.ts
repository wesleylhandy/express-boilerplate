import { MongoClient } from "mongodb";
import { EnvVars, valueFromEnvironment } from "src/utils/environment-variables";

export async function connectToMongoDB(dbname = "test") {
  const uri = valueFromEnvironment<string>(EnvVars.MONGODB_CONNECT_STRING) ?? `mongodb://localhost:27017/${dbname}`;
  try {
    const mongoClient = new MongoClient(uri);
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
