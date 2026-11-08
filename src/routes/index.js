const { Router } = require('express');
const { buildAuthRoutes, buildOauthRoutes } = require('./auth.routes');

const buildApiRouter = () => {
  const router = Router();
  router.use('/auth', buildAuthRoutes());
  router.use('/oauth', buildOauthRoutes());
  return router;
};

module.exports = { buildApiRouter };
