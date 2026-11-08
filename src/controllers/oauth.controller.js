const oauthService = require('../services/oauth.service');
const tokenService = require('../services/token.service');
const userModel = require('../models/user.model');
const { config } = require('../config/env');
const { logger } = require('../utils/logger');

const COOKIE_OPTIONS = (maxAgeMs, path = '/api/v1/auth') => ({
  httpOnly: true,
  secure: config.isProd,
  sameSite: 'lax',
  path,
  maxAge: maxAgeMs,
});

// OAuth state cookie must be readable by /api/v1/oauth/* routes → path must be /api/v1/oauth
const STATE_COOKIE_OPTIONS = (maxAgeMs) => COOKIE_OPTIONS(maxAgeMs, '/api/v1/oauth');

const buildErrorUrl = (message) => `${config.frontendUrl}/oauth/callback?status=error&message=${encodeURIComponent(message)}`;
const successUrl = () => `${config.frontendUrl}/oauth/callback?status=success`;

const startGoogle = (req, res) => {
  const { state, url } = oauthService.buildAuthUrl();
  res.cookie(oauthService.STATE_COOKIE, state, STATE_COOKIE_OPTIONS(oauthService.STATE_MAX_AGE_MS));
  return res.redirect(url);
};

const handleGoogleCallback = async (req, res, next) => {
  try {
    const { code, state } = req.query;

    if (req.cookies?.[oauthService.STATE_COOKIE] !== state) {
      return res.redirect(buildErrorUrl('Sign-in session expired. Please try again.'));
    }

    const profile = await oauthService.loginWithGoogle(code);
    const user = await userModel.findById(profile.id);
    await tokenService.issueSession(req, res, user);

    res.cookie(oauthService.STATE_COOKIE, '', STATE_COOKIE_OPTIONS(1));
    return res.redirect(successUrl());
  } catch (error) {
    return redirectWithError(error, res);
  }
};

const redirectWithError = (error, res) => {
  logger.error(`Google OAuth failed: ${error.stack || error.message}`);
  return res.redirect(buildErrorUrl('Google sign-in failed. Please try again.'));
};

module.exports = { startGoogle, handleGoogleCallback };
