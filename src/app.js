const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { config } = require('./config/env');
const { buildApiRouter } = require('./routes');
const { errorHandler, notFoundHandler } = require('./utils/error-handler');

const buildCorsOptions = () => ({
  origin: (origin, callback) => {
    if (config.isProd) {
      return config.cors.origins.includes(origin) || callback(null, config.cors.origins.includes(origin));
    }
    return callback(null, true); // dev: allow any origin (frontend uses cookies)
  },
  credentials: true,
});

const createApp = () => {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors(buildCorsOptions()));
  app.use(express.json({ limit: '10kb' }));
  app.use(cookieParser());

  app.get('/health', (req, res) => res.json({ success: true, data: { status: 'up' } }));
  app.use('/api/v1', buildApiRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

module.exports = { createApp };
