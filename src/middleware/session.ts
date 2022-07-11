import { Express, Request } from 'express';
import session, { SessionOptions } from 'express-session';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from 'winston';
import { EnvVars, valueFromEnvironment } from '../utils/environment-variables';
import { isAbsent } from "@perfective/common";

export function configureSession(app: Express, logger: Logger, isProduction: boolean, sessionOptions: Partial<SessionOptions> = {}) {
    try {
        const sessionSecret = valueFromEnvironment<string>(EnvVars.SESSION_SECRET);

        if (isAbsent(sessionSecret)) {
            throw new Error('Invalide Session Secret');
        }

        if (isAbsent(sessionOptions.store)) {
            throw new Error('Missing Session Store');
        }

        const options: SessionOptions = {
            cookie: { maxAge: 30 * 24 * 60 * 60 * 1000, secure: false },
            saveUninitialized: true,
            resave: true,
            genid: function(req: Request) {
                return uuidv4(); // use UUIDs for session IDs
            },
            ...sessionOptions,
            secret: sessionSecret,
        };

        if (isProduction) {
            app.set("trust proxy", 1); // trust first proxy
            if (typeof options.cookie !== 'undefined') {
                options.cookie.secure = true; // serve secure cookies
            }
        }

        app.use(session(options));

    } catch(error) {
        logger.log('error', JSON.stringify({ type: "Session Could not Be started", error }, null, 5));
    }
}