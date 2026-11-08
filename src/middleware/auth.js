const { verifyAccessToken } = require('../utils/jwt');
const { unauthorized, forbidden } = require('../utils/error');
const userModel = require('../models/user.model');

const getAccessToken = (req) => req.cookies?.access_token || req.headers.authorization?.replace(/^Bearer /i, '');

/**
 * One-shot helper: pass a raw access token, get the DB user + decoded claims.
 * Throws ApiError(401) when the token is missing context, forged, expired — or
 * the account it points at no longer exists. Reused by requireAuth internally.
 * (Cookie vs header extraction is NOT included — pass the bare token string.)
 */
const userFromAccessToken = async (token) => {
  const claims = verifyAccessToken(token); // jwt.verify — throws on forged/expired
  const profile = await userModel.findById(claims.sub);
  if (!profile) throw unauthorized('Access token invalid or expired'); // account deleted
  return { claims, profile };
};

const requireAuth = async (req, res, next) => {
  try {
    const token = getAccessToken(req);
    if (!token) throw unauthorized('Access token missing');
    const { claims, profile } = await userFromAccessToken(token);
    req.user = claims;
    req.profile = profile; // fresh DB snapshot
    return next();
  } catch (error) {
    return error.name === 'ApiError' ? next(error) : next(unauthorized('Access token invalid or expired'));
  }
};

const requireVerified = (req, res, next) => {
  if (req.user?.verified) return next();
  return next(forbidden('EMAIL_NOT_VERIFIED', 'Please verify your email first.'));
};

const requireActiveUser = (req, res, next) => {
  if (!req.profile || req.profile.status !== 'active') {
    return next(forbidden('ACCOUNT_DISABLED', 'This account has been disabled.'));
  }
  return next();
};

module.exports = { requireAuth, requireVerified, requireActiveUser, userFromAccessToken };
