import MongoDBSession from 'connect-mongodb-session';
import session from 'express-session';
import { Logger } from 'winston';
import { EnvVars, valueFromEnvironment } from '../utils/environment-variables';

export function configureMongoDBStore(logger: Logger) {
    const MongoDBStore = MongoDBSession(session);

    const store = new MongoDBStore({
        uri: valueFromEnvironment<string>(EnvVars.MONGODB_CONNECT_STRING)
            ?? "mongodb://localhost:27017/connect_mongodb_session",
        collection: valueFromEnvironment<string>(EnvVars.SESSION_ID) ?? 'dev_store'
    });

    store.on("error", (error: unknown) => {
        logger.log('error', `MongoSessionStore Error: ${JSON.stringify(error, null, 5)}`);
    });

    return store;
}