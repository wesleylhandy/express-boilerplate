import cookieParser, { CookieParseOptions } from 'cookie-parser';
import { Express } from 'express';
import { EnvVars, valueFromEnvironment } from '../utils/environment-variables';

export function configureCookieParser(app: Express, options: Partial<CookieParseOptions> = {}) {
    app.use(cookieParser(valueFromEnvironment<string>(EnvVars.COOKIE_SECRET), options));
}