import { Express } from 'express';
import { Options, rateLimit } from 'express-rate-limit';

export function configureRateLimit(app: Express, options: Partial<Options> = {}) {
    app.use(
        rateLimit({
            windowMs: 15 * 60 * 1000,
            max: 100,
            standardHeaders: true,
            legacyHeaders: false,
            ...options,
        })
    )
}

