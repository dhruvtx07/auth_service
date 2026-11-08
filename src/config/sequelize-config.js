const { config } = require('./env');

/**
 * Used by sequelize-cli (db:migrate / db:seed:all).
 * NOTE: the CLI expects the key to be `username` (not `user`) — `user` is silently ignored.
 * Runtime app config lives in src/config/database.js.
 */
const cliDb = () => ({
  database: config.db.name,
  username: config.db.user,
  password: config.db.password,
  host: config.db.host,
  port: config.db.port,
  dialect: config.db.dialect,
  // UTC everywhere (same rule as src/config/database.js)
  timezone: '+00:00',
  logging: false,
});

module.exports = {
  development: cliDb(),
  test: cliDb(),
  production: cliDb(),
};
