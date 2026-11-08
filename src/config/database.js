const { Sequelize } = require('sequelize');
const { config } = require('./env');

/**
 * Single Sequelize instance for the whole app.
 * Adding new models later: define them in src/models/, they attach to this instance.
 */
const sequelize = new Sequelize(config.db.name, config.db.user, config.db.password, {
  host: config.db.host,
  port: config.db.port,
  dialect: config.db.dialect,
  // UTC everywhere: serializes JS Dates as UTC and forces `SET time_zone = '+00:00'`
  // per connection, so DEFAULT CURRENT_TIMESTAMP and audit triggers are UTC too.
  timezone: '+00:00',
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
  logging: config.isProd || !config.db.logQueries ? false : (sql) => require('../utils/logger').logger.debug(`🗄  ${sql}`),
  define: {
    underscored: true, // camelCase attrs ↔ snake_case columns automatically
  },
});

module.exports = { sequelize };
