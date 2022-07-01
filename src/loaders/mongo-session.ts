import { Express, Request } from 'express';
import MongoDBSession from 'connect-mongodb-session';
import session, { SessionOptions } from 'express-session';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from 'winston';

export function connectMongoSession(app: Express, logger: Logger) {

    const MongoDBStore = MongoDBSession(session);

    const store = new MongoDBStore({
        uri:
            process.env.MONGODB_CONNECT_STRING ||
            "mongodb://localhost:27017/connect_mongodb_session",
        collection: "mySessions"
    });

    store.on("error", (error: unknown) => {
        logger.error(error);
    });

    const options: SessionOptions = {
        cookie: { maxAge: 30 * 24 * 60 * 60 * 1000, secure: false },
        secret: process.env.SESSION_SECRET ?? 'oh-no!!!!',
        saveUninitialized: true,
        resave: true,
        store: store,
        genid: function(req: Request) {
            return uuidv4(); // use UUIDs for session IDs
        }
    };

    if (app.get("env") === "production") {
        app.set("trust proxy", 1); // trust first proxy
        if (typeof options.cookie !== 'undefined') {
            options.cookie.secure = true; // serve secure cookies
        }
    }

    app.use(session(options));
}