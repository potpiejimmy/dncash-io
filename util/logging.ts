import * as winston from 'winston';

/* define logger */
export let logger = new winston.Logger({
    transports: [
        new winston.transports.File({
            level: 'info',
            filename: './server.log',
            handleExceptions: true,
            json: true,
            maxsize: 5242880, //5MB
            maxFiles: 5,
            zippedArchive: true,
            colorize: false
        }),
        new winston.transports.Console({
            level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
            handleExceptions: true,
            json: false,
            colorize: true,
            timestamp: true
        })
    ],
    exitOnError: false
});

/* used by morgan to log HTTP requests */
export let stream = {
    write: function(message, encoding) {
        logger.verbose(message);
    }
};
