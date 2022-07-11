import express, { Express } from 'express';
import helmet from 'helmet';
import bodyParser from 'body-parser'
import compression from "compression";
import cors from "cors";
import multer from "multer";
import methodOverride from "method-override";
import hpp from 'hpp'

import { configureSession } from '../middleware/session';
import { configureRouteLogging } from '../middleware/logger';
import { configureCsrfMiddlware } from '../middleware/csrf-protection';
import { configureRateLimit } from '../middleware/rate-limit';
import { ExpressAppConfiguration, IApp } from './i-app';
import { configureCookieParser } from '../middleware/cookie-parser';
import { Logger } from 'winston';
import { isPresent } from '@perfective/common';

// TODO: Add HTTP/2, socket, and GraphQL support
export class ExpressApp implements IApp {
  private _config: ExpressAppConfiguration;
  private _app: Express;
  private _logger: Logger;

  // TODO: Add support for Route Tracing
  public constructor(config: ExpressAppConfiguration) {
    this._config = config;
    this._logger = config.logger;
    this._app = express();
  }

  public get app() {
    return this._app;
  }

  public get port() {
    return this._config.port;
  }

  // TBD: Does this need to be exposed to overwrite?
  public set config(configuration: ExpressAppConfiguration) {
    this._config = configuration;
  }

  public configureApplication = () => {
    this.hardenServer();
    this.configureOverrides();
    this.configureSessionStore();
    this.configureMiddleware();

    // NOTE: Order Matters - routers then views
    this.configureApiRouters();
    this.configureViewRenderer();

    this.configurePort();
  }

  protected configureRouteLogging = () => {
    configureRouteLogging(this._app, this._config.routeLoggingOptions);
  }

  protected hardenServer = () => {
    // use helmetjs to set common secure headers
    this._app.use(helmet());
    this._app.use(helmet.referrerPolicy({ policy: "no-referrer-when-downgrade" }));
    this._app.use(helmet.hidePoweredBy());
  
    // prevent DDOS attacks by stuffing Query Parameters
    this._app.use(hpp());

    // Set CORS headers
    this._app.use(cors(this._config.corsOptions));

    configureCookieParser(this._app, this._config.cookieOptions);

    // Set CSRF Headers
    configureCsrfMiddlware(this._app, this._config.csrfOptions);

    // set up rate limits for access to backend to prevent DDOS attacks
    configureRateLimit(this._app, this._config.rateLimitOptions);
  }

  protected configureOverrides = () => {
  //allow PUT, PATCH, DELETE via _method param
    this._app.use(methodOverride("_method"));
    // override with different headers; last one takes precedence
    this._app.use(methodOverride("X-HTTP-Method")); //          Microsoft
    this._app.use(methodOverride("X-HTTP-Method-Override")); // Google/GData
    this._app.use(methodOverride("X-Method-Override")); //      IBM

    //support gzip
    this._app.use(compression());

    //body parser for routes our app
    this._app.use(bodyParser.json());
    this._app.use(bodyParser.text());
    this._app.use(bodyParser.json({ type: "application/vnd.api+json" }));

    // for parsing multipart/form-data
    this._app.use(multer().array('files'));
  }

  protected configureSessionStore = () => {
    if (isPresent(this._config.sessionOptions)) {
      configureSession(this._app, this._logger, this._config.isProduction, this._config.sessionOptions)
    }
  }

  protected configureMiddleware = () => {
    this._config.middleware?.forEach(middleware => {
      this._app.use(middleware);
    });
  }

  protected configurePort = () => {
    this._app.set("port", this._config.port);
  }

  protected configureApiRouters = () => {
    this._config.apiRouters.forEach(api => {
      this._logger.log('info', `Router Initialized: ${api[0]}`);
      this._app.use(api[0], api[1]);
    })
  } 

  protected configureViewRenderer = () => {
    this._app.get('/', this._config.viewRenderer);
  }

}
