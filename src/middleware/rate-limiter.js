const rateLimit = require('express-rate-limit');
const { config } = require('../config/env');

const noopLimiter = (req, res, next) => next();

const makeLimiter = (windowMs, max, message) => {
  if (config.isTest) return noopLimiter; // keep tests deterministic (no 429s)
  return rateLimit({
    windowMs,
    max,
    message: { success: false, message, error: { code: 'TOO_MANY_REQUESTS', message } },
  });
};

const authLimiter = makeLimiter(15 * 60 * 1000, 30, 'Too many requests, please try again later.');
const strictAuthLimiter = makeLimiter(15 * 60 * 1000, 10, 'Too many attempts, please try again in 15 minutes.');

module.exports = { authLimiter, strictAuthLimiter };
