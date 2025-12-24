/**
 * Winston Logger Configuration
 * Structured logging with file rotation
 */
const winston = require('winston');
const path = require('path');

// Define log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

// Define colors for each level
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue',
};

winston.addColors(colors);

// Define log format
const format = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(
        (info) => `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}${info.stack ? '\n' + info.stack : ''}`
    )
);

// Console format with colors
const consoleFormat = winston.format.combine(
    winston.format.colorize({ all: true }),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(
        (info) => `${info.timestamp} [${info.level}]: ${info.message}`
    )
);

// Define transports
const transports = [
    // Console output
    new winston.transports.Console({
        format: consoleFormat,
    }),
];

// Add file transports in production
if (process.env.NODE_ENV === 'production') {
    transports.push(
        // Error logs
        new winston.transports.File({
            filename: path.join(__dirname, '../logs/error.log'),
            level: 'error',
            format,
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        // Combined logs
        new winston.transports.File({
            filename: path.join(__dirname, '../logs/combined.log'),
            format,
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        })
    );
}

// Create logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    levels,
    format,
    transports,
    exitOnError: false,
});

// HTTP request logger stream for Morgan
logger.stream = {
    write: (message) => {
        logger.http(message.trim());
    },
};

module.exports = logger;
