import { createLogger, format, transports } from 'winston';

export const initLogger = () => {
    const logger = createLogger({
        exitOnError: false,
        format: format.json(),
        transports: [
        new transports.File({
            filename: 'app.log',
            level: 'info',
            options: { flags: 'w' }
        }),
        new transports.File({
            filename: 'app-errors.log',
            level: 'error',
            options: { flags: 'w' }
        })
        ]
    });
    logger.exceptions.handle(
        new transports.File({ filename: 'exceptions.log' })
    );

    if(process.env.NODE_ENV !== 'production') {
        logger.add(new transports.Console({
            format: format.simple(),
        }))
    }

    return logger;
}
