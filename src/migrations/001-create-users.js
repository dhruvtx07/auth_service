/**
 * 001 — users (with created_at / updated_at maintained on every row)
 * Run: npx sequelize-cli db:migrate   |   Undo: npx sequelize-cli db:migrate:undo
 */
const { DataTypes, literal } = require('sequelize');

const USERS = {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  email: { type: DataTypes.STRING(191), allowNull: false, unique: true },
  password_hash: { type: DataTypes.STRING(255), allowNull: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  avatar_url: { type: DataTypes.STRING(500), allowNull: true },
  email_verified: { type: DataTypes.TINYINT(1), allowNull: false, defaultValue: 0 },
  auth_provider: { type: DataTypes.ENUM('email', 'google'), allowNull: false, defaultValue: 'email' },
  // 'pending' = registered, email not verified yet (auth.service registers users here)
  status: { type: DataTypes.ENUM('active', 'pending', 'disabled'), allowNull: false, defaultValue: 'pending' },
  last_login_at: { type: DataTypes.DATE, allowNull: true },
  // UTC-stamped by the DB itself: literal() is emitted raw by the DDL generator,
  // unlike DataTypes.NOW which Sequelize silently drops (defaultValueSchemable=false).
  // UTC is guaranteed because every connection runs `SET time_zone = '+00:00'`
  // (src/config/database.js).
  // created_at: fallback stamping for raw INSERTs that omit it.
  // updated_at: DB-maintained on raw UPDATEs that omit it (Sequelize writes it itself).
  created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP') },
  updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
};

module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable('users', USERS);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('users_audit'); // audit table + triggers survive standalone
    await queryInterface.query('DROP TRIGGER IF EXISTS `users_audit_update`');
    await queryInterface.query('DROP TRIGGER IF EXISTS `users_audit_delete`');
    await queryInterface.dropTable('users');
  },
};
