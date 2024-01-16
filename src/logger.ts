import { createLogger, transports, format, Logger } from 'winston';

const logger = createLogger({
    transports: [
        new transports.Console(),
    ],
    format: format.combine(
        format.colorize(),
        format.timestamp({ format: 'MM-DD HH:mm:ss' }),
        format.printf(({ timestamp, level, message }) => {
            return `[${timestamp}] ${level}: ${message}`
        }),
    ),
})

export {
    logger,
}
