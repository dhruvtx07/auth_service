const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { sha256 } = require('../utils/crypto');

const RefreshToken = sequelize.define('RefreshToken', {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  tokenHash: { type: DataTypes.STRING(255), allowNull: false, unique: true },
  expiresAt: { type: DataTypes.DATE, allowNull: false },
  revokedAt: { type: DataTypes.DATE, allowNull: true },
  userAgent: { type: DataTypes.STRING(255), allowNull: true },
  ip: { type: DataTypes.STRING(64), allowNull: true },
}, {
  tableName: 'refresh_tokens',
});

// ── Static helpers (keep the tiny-function API used by services) ──
const create = ({ userId, token, expiresAt, userAgent = null, ip = null }) =>
  RefreshToken.create({ userId, tokenHash: sha256(token), expiresAt, userAgent, ip });

const findValidByToken = async (token) => RefreshToken.findOne({
  where: { tokenHash: sha256(token), revokedAt: null, expiresAt: { [Op.gt]: new Date() } },
});

const revokeById = (id) =>
  RefreshToken.update({ revokedAt: new Date() }, { where: { id, revokedAt: null } });

const revokeAllForUser = (userId) =>
  RefreshToken.update({ revokedAt: new Date() }, { where: { userId, revokedAt: null } });

const deleteExpired = () =>
  RefreshToken.destroy({ where: { expiresAt: { [Op.lt]: new Date() } } });

module.exports = { RefreshToken, create, findValidByToken, revokeById, revokeAllForUser, deleteExpired };
