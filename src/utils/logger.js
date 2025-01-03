// src/utils/logger.js
const winston = require('winston');
const path = require('path');

// Custom format for better object logging
const customFormat = winston.format.printf(({ level, message, timestamp }) => {
    // If message is an object, stringify it
    const formattedMessage = typeof message === 'object' 
        ? JSON.stringify(message, null, 2)
        : message;
        
    return `${timestamp} ${level}: ${formattedMessage}`;
});

const logger = winston.createLogger({
    level: 'debug',
    format: winston.format.combine(
        winston.format.timestamp(),
        customFormat
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.timestamp(),
                customFormat
            )
        }),
        new winston.transports.File({
            filename: path.join('logs', 'error.log'),
            level: 'error',
            format: winston.format.combine(
                winston.format.timestamp(),
                customFormat
            )
        }),
        new winston.transports.File({
            filename: path.join('logs', 'combined.log'),
            format: winston.format.combine(
                winston.format.timestamp(),
                customFormat
            )
        })
    ]
});

module.exports = logger;