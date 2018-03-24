import * as winston from 'winston';

winston.emitErrs = true;

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
            level: 'debug',
            handleExceptions: true,
            json: false,
            colorize: true
        })
    ],
    exitOnError: false
});

export let stream = {
    write: function(message, encoding) {
        logger.info(message);
    }
};
