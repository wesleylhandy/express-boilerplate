import Redis from 'ioredis'
import session from 'express-session';
import ConnectRedis, { RedisStoreOptions } from 'connect-redis';

import { Logger } from 'winston';

export function configureMongoDBStore(
    logger: Logger,
    redisClientOptions: ConstructorParameters<typeof Redis> = [],
    redisStoreOptions: Partial<Omit<RedisStoreOptions, 'client'>> = {},
) {
    const RedisStore = ConnectRedis(session);

    const client = new Redis(...redisClientOptions);

    const store = new RedisStore({
        client,
        ...redisStoreOptions,
    });

    client.on("error", (error: unknown) => {
        logger.error(error);
    });

    return store;
}