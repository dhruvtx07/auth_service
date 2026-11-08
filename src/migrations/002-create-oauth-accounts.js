/**
 * 002 — oauth_accounts (with created_at / updated_at)
 * Run: npx sequelize-cli db:migrate
 */
const { DataTypes, literal } = require('sequelize');

const OAUTH_ACCOUNTS = {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  user_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  provider: { type: DataTypes.ENUM('google'), allowNull: false },
  provider_user_id: { type: DataTypes.STRING(191), allowNull: false },
  // UTC-stamped DB defaults — see 001 — users (Sequelize drops DataTypes.NOW
  // from DDL; literal() is emitted raw and WORKS at createTable time).
  created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP') },
  updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
};

module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable('oauth_accounts', OAUTH_ACCOUNTS);
    await queryInterface.addIndex('oauth_accounts', ['provider', 'provider_user_id'], {
      unique: true,
      name: 'uq_oauth_provider_user',
    });
    await queryInterface.addIndex('oauth_accounts', ['user_id'], { name: 'idx_oauth_user' });
  },

  async down(queryInterface) {
    await queryInterface.query('DROP TRIGGER IF EXISTS `oauth_accounts_audit_update`');
    await queryInterface.query('DROP TRIGGER IF EXISTS `oauth_accounts_audit_delete`');
    await queryInterface.dropTable('oauth_accounts_audit');
    await queryInterface.dropTable('oauth_accounts');
  },
};
