/**
 * Model registry — import all models + associations from here in future projects.
 * Usage: const { sequelize, User, OAuthAccount } = require('./models');
 */
const user = require('./user.model');
const refreshToken = require('./refresh-token.model');
const emailToken = require('./email-token.model');
const oauthAccount = require('./oauth-account.model');
const errorLog = require('./error-log.model');
const { sequelize } = require('../config/database');

// Associations (ready for future models & eager loading)
user.User.hasMany(refreshToken.RefreshToken, { as: 'refreshTokens', foreignKey: 'user_id' });
user.User.hasMany(emailToken.EmailToken, { as: 'emailTokens', foreignKey: 'user_id' });
user.User.hasMany(oauthAccount.OAuthAccount, { as: 'oauthAccounts', foreignKey: 'user_id' });
refreshToken.RefreshToken.belongsTo(user.User, { as: 'user', foreignKey: 'user_id' });
emailToken.EmailToken.belongsTo(user.User, { as: 'user', foreignKey: 'user_id' });
oauthAccount.OAuthAccount.belongsTo(user.User, { as: 'user', foreignKey: 'user_id' });

// error_logs has NO Sequelize associations: it stores a plain user_id (no FK)
// so entries survive user deletion, and it's written outside the request cycle.

// NOTE: auditing is handled by DATABASE triggers (src/migrations/005-008) — no app hooks.

module.exports = {
  sequelize,
  User: user.User,
  ...user,
  ...refreshToken,
  ...emailToken,
  ...oauthAccount,
  ...errorLog,
};
