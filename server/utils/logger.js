const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    if (stack) {
      return `[${timestamp}] [${level.toUpperCase()}]: ${message}\n${stack}`;
    }
    return `[${timestamp}] [${level.toUpperCase()}]: ${message}`;
  })
);

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // Write all logs to combined.log
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write errors to error.log
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write sync logs to sync.log
    new winston.transports.File({
      filename: path.join(logsDir, 'sync.log'),
      level: 'info',
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    }),
  ],
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message }) => {
          return `[${timestamp}] ${level}: ${message}`;
        })
      ),
    })
  );
}

// Create specialized loggers for different modules
const syncLogger = {
  info: (message, meta) => {
    logger.info(`[SYNC] ${message}`, meta);
  },
  warn: (message, meta) => {
    logger.warn(`[SYNC] ${message}`, meta);
  },
  error: (message, meta) => {
    logger.error(`[SYNC] ${message}`, meta);
  },
  debug: (message, meta) => {
    logger.debug(`[SYNC] ${message}`, meta);
  },
  // Special method for sync events with emojis (console only in dev)
  event: (emoji, message, data) => {
    const fullMessage = `${emoji} ${message}`;
    logger.info(`[SYNC] ${fullMessage}`);
    if (data && process.env.NODE_ENV !== 'production') {
      console.log('   ', JSON.stringify(data, null, 2).substring(0, 500));
    }
  },
};

const userSyncLogger = {
  info: (message, meta) => {
    logger.info(`[USER_SYNC] ${message}`, meta);
  },
  warn: (message, meta) => {
    logger.warn(`[USER_SYNC] ${message}`, meta);
  },
  error: (message, meta) => {
    logger.error(`[USER_SYNC] ${message}`, meta);
  },
  debug: (message, meta) => {
    logger.debug(`[USER_SYNC] ${message}`, meta);
  },
  event: (emoji, message, data) => {
    const fullMessage = `${emoji} ${message}`;
    logger.info(`[USER_SYNC] ${fullMessage}`);
    if (data && process.env.NODE_ENV !== 'production') {
      console.log('   ', JSON.stringify(data, null, 2).substring(0, 500));
    }
  },
};

const attendanceLogger = {
  info: (message, meta) => {
    logger.info(`[ATTENDANCE] ${message}`, meta);
  },
  warn: (message, meta) => {
    logger.warn(`[ATTENDANCE] ${message}`, meta);
  },
  error: (message, meta) => {
    logger.error(`[ATTENDANCE] ${message}`, meta);
  },
  debug: (message, meta) => {
    logger.debug(`[ATTENDANCE] ${message}`, meta);
  },
  event: (emoji, message, data) => {
    const fullMessage = `${emoji} ${message}`;
    logger.info(`[ATTENDANCE] ${fullMessage}`);
    if (data && process.env.NODE_ENV !== 'production') {
      console.log('   ', JSON.stringify(data, null, 2).substring(0, 500));
    }
  },
};

module.exports = {
  logger,
  syncLogger,
  userSyncLogger,
  attendanceLogger,
};
