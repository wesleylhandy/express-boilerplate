import { config } from 'dotenv';
import { Logger } from 'winston';
import { ExpressApp } from './app';
import { EnvVars, valueFromEnvironment } from '../utils/environment-variables';
import { subdomainMiddlware } from '../middleware/subdomain';
import { developmentLogsMiddleware } from '../middleware/development-logs';
import { viewRenderer } from '../views/view-renderer';
import { configureUserAuthenticationRoutes } from '../api/user-authentication';
import { configureMongoDBStore } from '../loaders/mongo-store';

export interface WorkerAppConfiguration {
    workerId: number;
    logger: Logger;
    isProduction: boolean;
}

export function configureWorkerApp({ workerId, logger, isProduction}: WorkerAppConfiguration) {
    if (!isProduction) {
        config();
    }

    const expressApp = new ExpressApp({
        apiRouters: [configureUserAuthenticationRoutes(workerId, logger)], 
        isProduction,
        logger,
        middleware: [subdomainMiddlware, developmentLogsMiddleware(isProduction, workerId)],
        port: valueFromEnvironment<number>(EnvVars.PORT) ?? 8080,
        sessionOptions: {
            store: configureMongoDBStore(logger)
        },
        viewRenderer: viewRenderer(logger),
        workerId,
    });

    return expressApp.app;
  }
