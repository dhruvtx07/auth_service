const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');

const ErrorLog = sequelize.define('ErrorLog', {
  userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  status: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  code: { type: DataTypes.STRING(64), allowNull: false },
  message: { type: DataTypes.STRING(255), allowNull: false },
  details: { type: DataTypes.JSON, allowNull: true },
  stack: { type: DataTypes.TEXT, allowNull: true },
  method: { type: DataTypes.STRING(10), allowNull: true },
  path: { type: DataTypes.STRING(255), allowNull: true },
  requestId: { type: DataTypes.STRING(64), allowNull: true },
}, {
  tableName: 'error_logs',
});

// ── Static helpers ──────────────────────────────────────────
/**
 * Fire-and-forget error persistence. Never throws — a failing log write
 * must not mask or break the error handling that triggered it.
 * @returns {Promise<object|null>} the created row, or null on failure
 */
const write = async (error = {}) => {
  try {
    return await ErrorLog.create({
      userId: error.userId ?? null,
      status: error.status ?? 500,
      code: String(error.code ?? 'INTERNAL_ERROR').slice(0, 64),
      message: String(error.message ?? 'Unknown error').slice(0, 255),
      details: error.details ?? null,
      stack: error.stack ?? null,
      method: error.method ?? null,
      path: error.path ? String(error.path).slice(0, 255) : null,
      requestId: error.requestId ?? null,
    });
  } catch (err) {
    console.error(`⚠️ Failed to persist error log: ${err.message}`);
    return null;
  }
};

/** Paging for future admin dashboards: newest first. */
const list = ({ page = 1, pageSize = 20, code, userId } = {}) => ErrorLog.findAndCountAll({
  where: {
    ...(code && { code }),
    ...(userId && { userId }),
  },
  order: [['id', 'DESC']],
  offset: (page - 1) * pageSize,
  limit: pageSize,
});

/** Housekeeping: prune logs older than N days (run via cron/task). */
const prune = (days = 30) => ErrorLog.destroy({
  where: { createdAt: { [Op.lt]: new Date(Date.now() - days * 24 * 60 * 60 * 1000) } },
});

module.exports = { ErrorLog, write, list, prune };
