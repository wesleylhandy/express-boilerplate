import crypto from 'crypto';
import { Express, Request } from 'express';
import { EnvVars, valueFromEnvironment } from '../utils/environment-variables';
import * as jwtCSRF from '../utils/jwt-csrf'
import { isAbsent } from '@perfective/common'

// borrowed and updated jwt-csrf code from https://github.com/krakenjs/jwt-csrf
const secret = (jwtSecret: string) => crypto
    .createHash("sha256")
    .update(jwtSecret)
    .digest("base64")
    .slice(0, 32);

const getUserToken = (req: Request) => {
 const xToken = req.get("x-auth-token");
 const token =
   xToken && xToken.includes("Token ") ? xToken.split(" ")[1] : null;

 return token;
};

export function configureCsrfMiddlware(app: Express, options: Partial<jwtCSRF.JwtCsrfConfigurationOptions> = {}) {
    const jwtSecret = valueFromEnvironment<string>(EnvVars.JWT_SECRET);

    if (isAbsent(jwtSecret)) {
        throw new Error('Invalid JWT Secret');
    }

    app.use(
        jwtCSRF.middleware({
            csrfDriver: "AUTHED_TOKEN",
            secret: secret(jwtSecret),
            expiresInMinutes: 480,
            excludeUrls: [/^.*(login|signup)$/i],
            getUserToken,
            ...options,
        })
    );
}
