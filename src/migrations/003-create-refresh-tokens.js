/**
 * 003 — refresh_tokens (with created_at / updated_at)
 * Run: npx sequelize-cli db:migrate
 */
const { DataTypes, literal } = require('sequelize');

const REFRESH_TOKENS = {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  user_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  token_hash: { type: DataTypes.STRING(255), allowNull: false, unique: true },
  expires_at: { type: DataTypes.DATE, allowNull: false },
  revoked_at: { type: DataTypes.DATE, allowNull: true },
  user_agent: { type: DataTypes.STRING(255), allowNull: true },
  ip: { type: DataTypes.STRING(64), allowNull: true },
  // UTC-stamped DB defaults — see 001 — users (Sequelize drops DataTypes.NOW
  // from DDL; literal() is emitted raw and WORKS at createTable time).
  created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP') },
  updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
};

module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable('refresh_tokens', REFRESH_TOKENS);
    await queryInterface.addIndex('refresh_tokens', ['user_id'], { name: 'idx_refresh_user' });
  },

  async down(queryInterface) {
    await queryInterface.query('DROP TRIGGER IF EXISTS `refresh_tokens_audit_update`');
    await queryInterface.query('DROP TRIGGER IF EXISTS `refresh_tokens_audit_delete`');
    await queryInterface.dropTable('refresh_tokens_audit');
    await queryInterface.dropTable('refresh_tokens');
  },
};
