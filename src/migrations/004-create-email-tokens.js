/**
 * 004 — email_tokens (verify + reset, with created_at / updated_at)
 * Run: npx sequelize-cli db:migrate
 */
const { DataTypes, literal } = require('sequelize');

const EMAIL_TOKENS = {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  user_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  type: { type: DataTypes.ENUM('verify', 'reset'), allowNull: false },
  token_hash: { type: DataTypes.STRING(255), allowNull: false, unique: true },
  expires_at: { type: DataTypes.DATE, allowNull: false },
  used_at: { type: DataTypes.DATE, allowNull: true },
  // UTC-stamped DB defaults — see 001 — users (Sequelize drops DataTypes.NOW
  // from DDL; literal() is emitted raw and WORKS at createTable time).
  created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP') },
  updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
};

module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable('email_tokens', EMAIL_TOKENS);
    await queryInterface.addIndex('email_tokens', ['user_id', 'type'], { name: 'idx_email_token_user' });
  },

  async down(queryInterface) {
    await queryInterface.query('DROP TRIGGER IF EXISTS `email_tokens_audit_update`');
    await queryInterface.query('DROP TRIGGER IF EXISTS `email_tokens_audit_delete`');
    await queryInterface.dropTable('email_tokens_audit');
    await queryInterface.dropTable('email_tokens');
  },
};
