const fs = require('fs');
const path = require('path');
const winston = require('winston');
const { config } = require('../config/env');

/** UTC stamp — matches DB timestamps (single source of truth, see config/env.js). */
const utcStamp = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
const plainFormat = winston.format.combine(
  winston.format.timestamp({ format: utcStamp }),
  winston.format.printf(({ timestamp, level, message }) => `[${timestamp}] ${level}: ${message}`),
);
const consoleFormat = winston.format.combine(plainFormat, winston.format.colorize());

/** Directory from config — LOGS_DIR env var, defaulting to the service root's logs/ (cwd-independent). */
const LOGS_DIR = path.resolve(config.logsDir);
fs.mkdirSync(LOGS_DIR, { recursive: true });

const rotate = { maxsize: 5 * 1024 * 1024, maxFiles: 5, tailable: true };

const consoleTransport = new winston.transports.Console({ format: consoleFormat });
const appFileTransport = new winston.transports.File({
  filename: path.join(LOGS_DIR, 'app.log'),
  format: plainFormat,
  ...rotate,
});
const errorFileTransport = new winston.transports.File({
  filename: path.join(LOGS_DIR, 'error.log'),
  level: 'error',
  format: plainFormat,
  ...rotate,
});

const logger = winston.createLogger({
  level: config.isProd ? 'info' : 'debug',
  transports: config.isTest
    ? [consoleTransport] // tests stay quiet on disk
    : [
        consoleTransport,
        appFileTransport,
        errorFileTransport,
      ],
  exceptionHandlers: config.isTest ? [] : [errorFileTransport],
  rejectionHandlers: config.isTest ? [] : [errorFileTransport],
});

module.exports = { logger, LOGS_DIR };
