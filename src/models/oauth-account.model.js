const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const OAuthAccount = sequelize.define('OAuthAccount', {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  provider: { type: DataTypes.ENUM('google'), allowNull: false },
  providerUserId: { type: DataTypes.STRING(191), allowNull: false },
}, {
  tableName: 'oauth_accounts',
});

// ── Static helpers ──────────────────────────────────────────
const findByProviderUser = (provider, providerUserId) =>
  OAuthAccount.findOne({ where: { provider, providerUserId } });

const findByUser = (userId, provider) => OAuthAccount.findOne({ where: { userId, provider } });

const create = ({ userId, provider, providerUserId }) =>
  OAuthAccount.create({ userId, provider, providerUserId });

const destroyById = (id) => OAuthAccount.destroy({ where: { id } });

module.exports = { OAuthAccount, findByProviderUser, findByUser, create, destroyById };
