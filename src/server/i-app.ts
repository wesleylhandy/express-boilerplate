import { Express, Request, RequestHandler, Router } from 'express';
import { CorsOptions, CorsOptionsDelegate } from "cors";
import { JwtCsrfConfigurationOptions } from '../utils/jwt-csrf';
import { Options as RateLimitOptions } from 'express-rate-limit';
import { CookieParseOptions } from "cookie-parser";
import { Logger } from 'winston';
import { LoggerOptions } from 'express-winston';
import { SessionOptions } from 'express-session';
import Redis from 'ioredis'
import { RedisStoreOptions } from 'connect-redis';

export type SessionStoreType = 'redis' | 'mongodb';

type SessionStoreOptions<StoreType extends SessionStoreType> = StoreType extends 'redis'
    ? {
        redisClientOptions: ConstructorParameters<typeof Redis>;
        redisStoreOptions: Partial<Omit<RedisStoreOptions, 'client'>>,
    }
    : never;

type Path = string;

export interface ExpressAppConfiguration<StoreType extends SessionStoreType = SessionStoreType> {
    workerId: number;
    port: number;
    logger: Logger;
    isProduction: boolean;
    viewRenderer: RequestHandler;
    apiRouters: [Path, Router][];
    routeLoggingOptions?: Partial<LoggerOptions>;
    cookieOptions?: Partial<CookieParseOptions>;
    corsOptions?: CorsOptions | CorsOptionsDelegate;
    csrfOptions?: Partial<JwtCsrfConfigurationOptions>;
    rateLimitOptions?: Partial<RateLimitOptions>;
    middleware?: RequestHandler[];
    sessionOptions?: Partial<SessionOptions>;
    sessionStoreOptions?: SessionStoreOptions<StoreType>;
}

export interface IApp<StoreType extends SessionStoreType = SessionStoreType>  {
    app: Express;
    config: ExpressAppConfiguration<StoreType>;
    configureApplication: () => void;
    port: number;
}