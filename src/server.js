const { sequelize } = require('./config/database');
const { createApp } = require('./app');
const { config } = require('./config/env');
const { logger } = require('./utils/logger');
const { installCrashHandlers } = require('./utils/crash-handler');

// Must be first: only uncaughtException can kill the process mid-startup.
installCrashHandlers();


/** Boots only after the DB connection is proven. */
const start = async () => {
  try {
    await sequelize.authenticate();
    logger.info(`✅ Database connected (${config.db.host}:${config.db.port}/${config.db.name})`);
  } catch (error) {
    logger.error(`❌ Database connection failed — refusing to start: ${error.message}`);
    process.exit(1); // no DB → no server
  }

  const app = createApp();
  app.listen(config.port, () => {
    logger.info(`🚀 Auth service running on http://localhost:${config.port} (${config.env})`);
  });
};

start();
