const { logger } = require('./logger');
const { write: writeErrorLog } = require('../models/error-log.model');

/**
 * Last-resort persistence for errors that never reach the Express
 * errorHandler (async callbacks, timers, top-level module code).
 * Request-cycle errors are already logged there — this is the net for the rest.
 */
const logCrash = (error, code) => {
  const err = error instanceof Error ? error : new Error(String(error ?? 'unknown crash'));
  logger.error(`💥 ${code}: ${err.stack || err.message}`);
  return writeErrorLog({
    status: 500,
    code,
    message: err.message,
    stack: err.stack ?? null,
  }).catch((logErr) => logger.warn(`⚠️ error_logs write failed: ${logErr.message}`));
};

/**
 * Installs process-level handlers. Call once at startup, before anything else.
 * - unhandledRejection  → log, keep the process alive (Node ≥15 default crash)
 * - uncaughtException   → log, then exit(1): the process state is unreliable
 */
const installCrashHandlers = () => {
  process.on('unhandledRejection', (reason) => logCrash(reason, 'UNHANDLED_REJECTION'));
  process.on('uncaughtException', (error) => {
    logCrash(error, 'UNCAUGHT_EXCEPTION').finally(() => process.exit(1));
  });
};

module.exports = { installCrashHandlers };
