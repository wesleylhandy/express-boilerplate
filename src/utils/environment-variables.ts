export enum EnvVars {
    PORT = 'PORT',
    JWT_SECRET = 'JWT_SECRET',
    MONGODB_CONNECT_STRING = 'MONGODB_CONNECT_STRING',
    SESSION_SECRET = 'SESSION_SECRET',
    COOKIE_SECRET = 'COOKIE_SECRET',
    DBNAME = 'DBNAME',
    DEPLOY_ENV = 'DEPLOY_ENV',
    NODE_ENV = 'NODE_ENV',
    SESSION_ID = 'SESSION_ID'
}

export function valueFromEnvironment<ReturnType>(variableName: EnvVars): ReturnType | undefined {
    return process.env[variableName] as unknown as ReturnType | undefined;
}