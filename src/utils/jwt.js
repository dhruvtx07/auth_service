const jwt = require('jsonwebtoken');
const { config } = require('../config/env');

const ACCESS_PAYLOAD = (user) => ({ sub: String(user.id), email: user.email, verified: Boolean(user.emailVerified) });
const REFRESH_PAYLOAD = (user, jti) => ({ sub: String(user.id), jti });

const sign = (payload, secret, expiresIn) => jwt.sign(payload, secret, { expiresIn });

const signAccessToken = (user) =>
  sign(ACCESS_PAYLOAD(user), config.jwt.accessSecret, `${config.jwt.accessTtlMinutes}m`);

const signRefreshToken = (user, jti) =>
  sign(REFRESH_PAYLOAD(user, jti), config.jwt.refreshSecret, `${config.jwt.refreshTtlDays}d`);

const verifyAccessToken = (token) => jwt.verify(token, config.jwt.accessSecret);

const verifyRefreshToken = (token) => jwt.verify(token, config.jwt.refreshSecret);

module.exports = { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken };
