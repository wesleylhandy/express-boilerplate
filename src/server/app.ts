import express, { Request, Response } from 'express';
import helmet from 'helmet';
import bodyParser from 'body-parser'
import cookieParser from "cookie-parser";
import compression from "compression";
import cors from "cors";
import multer from "multer";
import { rateLimit } from 'express-rate-limit';
import methodOverride from "method-override";
import hpp from 'hpp'
import { connectToMongoDB } from '../loaders/mongo-connect';
import { getUsersDAO } from '../models/users-dao';
import { userAuthController } from '../controllers/user-auth-controllers';
import crypto from 'crypto';
import { config } from 'dotenv';
import * as jwtCSRF from '../utils/jwt-csrf'
import { connectMongoSession } from '../loaders/mongo-session';
import { transports, format, Logger } from 'winston';
import expressWinston from 'express-winston';

// TODO: Extract App setup and middleware into Separate class

export const expressApp = (workerId: number, logger: Logger) => {
  if (process.env.NODE_ENV !== "production") {
    config();
  }

  const app = express();

  // Add logger middleware
  // TODO: Extract to own module
  app.use(expressWinston.logger({
    transports: [
      new transports.Console()
    ],
    format: format.combine(
      format.colorize(),
      format.json()
    ),
    meta: true, // optional: control whether you want to log the meta data about the request (default to true)
    msg: "HTTP {{req.method}} {{req.url}}", // optional: customize the default logging message. E.g. "{{res.statusCode}} {{req.method}} {{res.responseTime}}ms {{req.url}}"
    expressFormat: true, // Use the default Express/morgan request formatting. Enabling this will override any msg if true. Will only output colors with colorize set to true
    colorize: false, // Color the text and status code, using the Express/morgan color palette (text: gray, status: default green, 3XX cyan, 4XX yellow, 5XX red).
    ignoreRoute: function (_req, _res) { return false; } // optional: allows to skip some log messages based on request and/or response
  }));

  // use helmetjs to set common secure headers
  app.use(helmet());
  app.use(helmet.referrerPolicy({ policy: "no-referrer-when-downgrade" }));
  app.use(helmet.hidePoweredBy());

  // prevent DDOS attacks by stuffing Query Parameters
  app.use(hpp());

  //allow PUT, PATCH, DELETE via _method param
  app.use(methodOverride("_method"));
  // override with different headers; last one takes precedence
  app.use(methodOverride("X-HTTP-Method")); //          Microsoft
  app.use(methodOverride("X-HTTP-Method-Override")); // Google/GData
  app.use(methodOverride("X-Method-Override")); //      IBM

  /* Reconfigure for Production */
  app.use(cors());

  // Specify the port.
  var port = process.env.PORT || 8080;

  // ADD Subdomain, if any, to the request object
  app.use((req, res: Response<unknown, { subdomain: unknown }>, next) => {
    if (!req.subdomains.length || req.subdomains.slice(-1)[0] === "www") {
      next();
      return;
    }
    // otherwise we have subdomain here
    var subdomain = req.subdomains.slice(-1)[0];
    // keep it
    res.locals.subdomain = subdomain;
    next();
  });

  //support gzip
  app.use(compression());

  //body parser for routes our app
  app.use(bodyParser.json());
  // parsing application/json
  const extendedUrlParser = bodyParser.urlencoded({
    extended: true
  });
  // const unextendedUrlParser = bodyParser.urlencoded({ extended: false });
  app.use(bodyParser.text());
  app.use(bodyParser.json({ type: "application/vnd.api+json" }));


  // borrowed and updated jwt-csrf code from https://github.com/krakenjs/jwt-csrf
  const secret = crypto
    .createHash("sha256")
    .update(String(process.env.JWT_SECRET))
    .digest("base64")
    .slice(0, 32);

  const getUserToken = (req: Request) => {
    const xToken = req.get("x-auth-token");
    const token =
      xToken && xToken.includes("Token ") ? xToken.split(" ")[1] : null;

    return token;
  };

  const csrfProtection = jwtCSRF.middleware({
    csrfDriver: "AUTHED_TOKEN",
    secret,
    expiresInMinutes: 480,
    excludeUrls: [/^.*(login|signup)$/i],
    getUserToken
  });

  app.use(cookieParser());

  app.use(csrfProtection);

  // for parsing multipart/form-data
  app.use(multer().array('files'));

  // TODO: extract to middleware module
  //middleware to display session data in console during development and staging only
  if (process.env.NODE_ENV !== "production") {
    app.use((req, _res, next) => {
      console.log("\n*************REQUEST MIDDLEWARE***************\n");
      console.info("Worker", workerId);
      console.info({ subdomains: req.subdomains });
      console.info({'x-auth-token': req.get("x-auth-token")})
      console.info({'x-csrf-jwt': req.get('x-csrf-jwt')})
      console.log("\n**********************************************\n");
      next();
    });
  }

  connectMongoSession(app, logger);

   // TODO: extract to middleware module
  //middleware to display session data in console during development and staging only
  if (process.env.NODE_ENV !== "production") {
    app.use((req: Request & { session?: unknown, user?: unknown }, _res, next) => {
      console.log("\n*************SESSION MIDDLEWARE***************\n");
      console.info(req.session);
      console.info("\nLogged In: ", typeof req.user !== 'undefined'? 'true': 'false');
      console.log("\n**********************************************\n");
      next();
    });
  }

  // set up rate limits for access to backend to prevent DDOS attacks
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(apiLimiter);

  app.get("/", (req, res, next) => {
    // NOTE: Connect views HERE
    res.send("Hello World!");
  });

  // TODO: Extract into separate module
  const dbName = process.env.DBNAME || "test";
  connectToMongoDB(dbName)
    .then(async connection => {

      logger.log('info', "Somewhere a SQLFairy lost it's wings...Mongo Pokémon evolved.");

      try {
        const usersDAO = await getUsersDAO(connection, dbName, logger);
        process.on("message", async message => {
          if (message === "Process.Closing") {
            try {
              await connection.close();
              if (typeof process.send === 'function') {
                process.send("DB.Closed");
              }
            } catch (error) {
              logger.log('error', JSON.stringify(error, null, 5))
            }
          }
        });
        userAuthController(
          app,
          extendedUrlParser,
          usersDAO,
          logger,
        );
      } catch (error) {
        throw error as Error;
      }
    })
    .catch(error => {
      logger.log('error', JSON.stringify(error, null, 5))
      typeof process.send !== 'undefined' && process.send(`DB Connection Error on ${workerId}.`);
    });

    app.set("port", port);

    return app;
  }
