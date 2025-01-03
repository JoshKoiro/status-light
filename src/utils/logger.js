// src/utils/logger.js
const winston = require('winston');
const path = require('path');

// Custom format for console output
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp }) => {
        // Only format objects for file logging, keep console logging simple
        const msg = typeof message === 'object' ? '[Object details logged to file]' : message;
        return `${timestamp} ${level}: ${msg}`;
    })
);

// Custom format for file output
const fileFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
);

const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: fileFormat,
    transports: [
        // Console transport with minimal logging
        new winston.transports.Console({
            format: consoleFormat,
            level: 'info'  // Only show info and above in console
        }),
        // File transport with detailed logging
        new winston.transports.File({
            filename: path.join('logs', 'error.log'),
            level: 'error'
        }),
        new winston.transports.File({
            filename: path.join('logs', 'detailed.log'),
            level: 'debug'  // Capture all logs in file
        })
    ]
});

// Add timestamps to console output
logger.info('Logger initialized');

module.exports = logger;