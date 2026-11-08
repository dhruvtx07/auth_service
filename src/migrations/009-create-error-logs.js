/**
 * 009 — error_logs (no audit triggers needed: audit logs are themselves immutable)
 * Run: npx sequelize-cli db:migrate
 */
const { DataTypes, literal } = require('sequelize');

const ERROR_LOGS = {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  // Plain reference (no FK) so logs survive user deletion
  user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  status: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  code: { type: DataTypes.STRING(64), allowNull: false },
  message: { type: DataTypes.STRING(255), allowNull: false },
  details: { type: DataTypes.JSON, allowNull: true },
  stack: { type: DataTypes.TEXT, allowNull: true },
  method: { type: DataTypes.STRING(10), allowNull: true },
  path: { type: DataTypes.STRING(255), allowNull: true },
  request_id: { type: DataTypes.STRING(64), allowNull: true },
  // UTC-stamped DB defaults — see 001 — users (Sequelize drops DataTypes.NOW
  // from DDL; literal() is emitted raw and WORKS at createTable time).
  created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP') },
  updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
};

module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable('error_logs', ERROR_LOGS);
    await queryInterface.addIndex('error_logs', ['code'], { name: 'idx_error_log_code' });
    await queryInterface.addIndex('error_logs', ['created_at'], { name: 'idx_error_log_created' });
    await queryInterface.addIndex('error_logs', ['user_id'], { name: 'idx_error_log_user' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('error_logs');
  },
};
