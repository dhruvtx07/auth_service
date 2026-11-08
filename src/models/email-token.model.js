const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');

const EmailToken = sequelize.define('EmailToken', {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  type: { type: DataTypes.ENUM('verify', 'reset'), allowNull: false },
  tokenHash: { type: DataTypes.STRING(255), allowNull: false, unique: true },
  expiresAt: { type: DataTypes.DATE, allowNull: false },
  usedAt: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'email_tokens',
});

// ── Static helpers ──────────────────────────────────────────
const create = ({ userId, type, token, expiresAt }) =>
  EmailToken.create({ userId, type, tokenHash: token, expiresAt });

const invalidatePending = ({ userId, type }) =>
  EmailToken.destroy({ where: { userId, type, usedAt: null } });

const findValidByToken = async ({ token, type }) => EmailToken.findOne({
  where: { tokenHash: token, type, usedAt: null, expiresAt: { [Op.gt]: new Date() } },
});

const markUsed = (id) => EmailToken.update({ usedAt: new Date() }, { where: { id } });

module.exports = { EmailToken, create, invalidatePending, findValidByToken, markUsed };
