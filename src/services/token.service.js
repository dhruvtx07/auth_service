const { config } = require('../config/env');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { randomToken } = require('../utils/crypto');
const { unauthorized } = require('../utils/error');
const refreshTokenModel = require('../models/refresh-token.model');
const userModel = require('../models/user.model');

const HOUR = 60 * 60 * 1000;

const cookieOptions = (maxAgeMs, path = '/') => ({
  httpOnly: true,
  secure: config.isProd,
  sameSite: 'lax',
  path,
  maxAge: maxAgeMs,
});

const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';
const REFRESH_COOKIE_PATH = '/api/v1/auth';

const setAuthCookies = (res, user) => {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user, randomToken()); // jti → two sessions never share a token
  res.cookie(ACCESS_COOKIE, accessToken, cookieOptions(config.jwt.accessTtlMinutes * 60 * 1000));
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions(config.jwt.refreshTtlDays * 24 * HOUR, REFRESH_COOKIE_PATH));
  return { accessToken, refreshToken };
};

const clearAuthCookies = (res) => {
  res.cookie(ACCESS_COOKIE, '', cookieOptions(1));
  res.cookie(REFRESH_COOKIE, '', cookieOptions(1, REFRESH_COOKIE_PATH));
};

const persistRefreshToken = async (req, user, token) => {
  await refreshTokenModel.create({
    userId: user.id,
    token,
    expiresAt: new Date(Date.now() + config.jwt.refreshTtlDays * 24 * HOUR),
    userAgent: req.headers['user-agent'] || null,
    ip: req.ip || null,
  });
};

const issueSession = async (req, res, user) => {
  const { refreshToken } = setAuthCookies(res, user);
  await persistRefreshToken(req, user, refreshToken);
  await userModel.touchLastLogin(user.id);
  return user;
};

const readRefreshCookie = (req) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw unauthorized('No refresh token');
  try {
    return verifyRefreshToken(token);
  } catch {
    throw unauthorized('Refresh token is invalid or expired');
  }
};

const rotateSession = async (req, res) => {
  const payload = readRefreshCookie(req); // 401 on missing/forged/expired
  const stored = await refreshTokenModel.findValidByToken(req.cookies[REFRESH_COOKIE]);

  if (!stored) {
    // Token has been used or stolen before → revoke everything for that user.
    await refreshTokenModel.revokeAllForUser(payload.sub);
    clearAuthCookies(res);
    throw unauthorized('Refresh token is no longer valid');
  }

  await refreshTokenModel.revokeById(stored.id);
  const fresh = await issueSession(req, res, await userModel.findById(payload.sub));
  // publicUser: never serialize a full instance (password_hash would leak)
  return userModel.publicUser(fresh);
};

const revokeAllForUser = (userId) => refreshTokenModel.revokeAllForUser(userId);

const makeEmailTokenExpiry = (hours) => new Date(Date.now() + hours * HOUR);

module.exports = {
  issueSession,
  rotateSession,
  revokeAllForUser,
  setAuthCookies,
  clearAuthCookies,
  makeEmailTokenExpiry,
};
