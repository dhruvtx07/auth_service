const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const oauthController = require('../controllers/oauth.controller');
const { validate } = require('../utils/validate');
const { requireAuth, requireActiveUser } = require('../middleware/auth');
const { authLimiter, strictAuthLimiter } = require('../middleware/rate-limiter');

const buildAuthRoutes = () => {
  const router = Router();

  // Public flows
  router.post('/register', authLimiter, validate('register'), authController.register);
  router.post('/verify-email', authLimiter, validate('token'), authController.verifyEmail);
  router.post('/resend-verification', strictAuthLimiter, validate('email'), authController.resendVerification);
  router.post('/login', strictAuthLimiter, validate('login'), authController.login);
  router.post('/forgot-password', strictAuthLimiter, validate('email'), authController.forgotPassword);
  router.post('/reset-password', strictAuthLimiter, validate('reset'), authController.resetPassword);

  // Token lifecycle (cookie based)
  router.post('/refresh', authLimiter, authController.refresh);
  router.post('/logout', authLimiter, authController.logout);

  // Session & profile
  router.get('/me', authLimiter, requireAuth, requireActiveUser, authController.me);

  return router;
};

const buildOauthRoutes = () => {
  const router = Router();
  router.get('/google', authLimiter, oauthController.startGoogle);
  router.get('/google/callback', oauthController.handleGoogleCallback);
  return router;
};

module.exports = { buildAuthRoutes, buildOauthRoutes };
