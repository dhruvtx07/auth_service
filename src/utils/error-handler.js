const { ApiError } = require('./error');
const { fail } = require('./response');
const { config } = require('../config/env');
const { logger } = require('./logger');
const { write: writeErrorLog } = require('../models/error-log.model');

const isApiError = (error) => error instanceof ApiError;
const isDupEntry = (error) => error.code === 'ER_DUP_ENTRY';

const fromDuplicateEntry = (error) => {
  const field = (error.message.match(/for key '[\w.]*?(\w+)'/) || [])[1];
  return new ApiError(409, 'DUPLICATE_VALUE', `${field || 'Value'} already exists`, { field });
};

const fromZodError = (error) => new ApiError(
  422,
  'VALIDATION_ERROR',
  'Validation failed',
  error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
);

const logError = (error) => {
  // Controlled 4xx ApiErrors are normal traffic (validation, auth guards, 401
  // session checks from the frontend bootstrap): one tidy line, no stack spam.
  if (isApiError(error) && error.status < 500) {
    logger.warn(`⚠️ ${error.status} ${error.code}: ${error.message}`);
    return;
  }
  if (config.isProd) {
    logger.error(`Unhandled error: ${error.stack || error.message}`);
    return;
  }
  logger.error(`💥 ${error.stack || error.message}`);
};

const errorHandler = (error, req, res, next) => {
  logError(error);

  // Normalise every failure to an ApiError so the log and the response match.
  let apiError = error;
  if (error.name === 'ZodError') apiError = fromZodError(error);
  else if (isDupEntry(error)) apiError = fromDuplicateEntry(error);
  else if (!isApiError(error)) apiError = new ApiError(500, 'INTERNAL_ERROR', config.isProd ? 'Something went wrong' : error.message);

  // Fire-and-forget DB persistence — never blocks or breaks the response.
  writeErrorLog({
    userId: Number(req?.user?.sub ?? req?.profile?.id) || null,
    status: apiError.status,
    code: apiError.code,
    message: apiError.message,
    details: apiError.details ?? null,
    stack: error.stack ?? null,
    method: req?.method ?? null,
    path: req?.originalUrl ?? null,
    requestId: req?.id ?? null,
  }).catch((err) => logger.warn(`⚠️ error_logs write failed: ${err.message}`));

  return fail(req, res, {
    status: apiError.status,
    message: apiError.message,
    code: apiError.code,
    details: apiError.details,
  });
};

const notFoundHandler = (req, res, next) =>
  next(new ApiError(404, 'ROUTE_NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found`));

module.exports = { errorHandler, notFoundHandler };
