class ApiError extends Error {
  constructor(status, code, message, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const badRequest = (message, details) => new ApiError(400, 'BAD_REQUEST', message, details);
const unauthorized = (message = 'Unauthorized') => new ApiError(401, 'UNAUTHORIZED', message);
const forbidden = (code, message) => new ApiError(403, code, message);
const notFound = (message = 'Resource not found') => new ApiError(404, 'NOT_FOUND', message);
const conflict = (message) => new ApiError(409, 'CONFLICT', message);
const tooManyRequests = (message = 'Too many requests, try again later') =>
  new ApiError(429, 'TOO_MANY_REQUESTS', message);

module.exports = { ApiError, badRequest, unauthorized, forbidden, notFound, conflict, tooManyRequests };
