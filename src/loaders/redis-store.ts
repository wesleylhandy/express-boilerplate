import Redis from 'ioredis'
import session from 'express-session';
import ConnectRedis, { RedisStoreOptions } from 'connect-redis';

import { Logger } from 'winston';

export function configureRedisStore(
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
        logger.log('error', `RedisSession Error: ${JSON.stringify(error, null, 5)}`);
    });

    return store;
}