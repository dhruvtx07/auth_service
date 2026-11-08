const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { hashPassword, comparePassword } = require('../utils/crypto');

const User = sequelize.define('User', {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  email: { type: DataTypes.STRING(191), allowNull: false, unique: true },
  passwordHash: { type: DataTypes.STRING(255), allowNull: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  avatarUrl: { type: DataTypes.STRING(500), allowNull: true },
  emailVerified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  authProvider: { type: DataTypes.ENUM('email', 'google'), allowNull: false, defaultValue: 'email' },
  // fail-closed default: nothing is born active. Email signups inherit this via
  // registerUser; Google OAuth passes status: 'active' explicitly (its email is
  // provider-verified). Falls in line with the users migration's DB-side default.
  status: { type: DataTypes.ENUM('active', 'pending', 'disabled'), allowNull: false, defaultValue: 'pending' },
  lastLoginAt: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'users',
});

// ── Instance helpers (tiny functions) ───────────────────────
User.prototype.checkPassword = function checkPassword(plain) {
  return comparePassword(plain, this.passwordHash);
};

User.prototype.toPublic = function toPublic() {
  return publicUser(this);
};

// ── Static helpers ──────────────────────────────────────────
const publicUser = (user) => user && ({
  id: Number(user.id),
  email: user.email,
  name: user.name,
  avatarUrl: user.avatarUrl,
  emailVerified: Boolean(user.emailVerified),
  authProvider: user.authProvider,
  status: user.status,
  createdAt: user.createdAt,
});

const findById = async (id) => User.findByPk(id);

const findByEmail = async (email) => User.findOne({ where: { email } });

const createUser = async ({ email, name, passwordHash = null, authProvider = 'email', avatarUrl = null, status = 'active' }) =>
  User.create({ email, name, passwordHash, authProvider, avatarUrl, status, emailVerified: authProvider === 'google' });

// Verification completes the signup: flips email_verified, and ONLY a
// 'pending' account is released to 'active' — an admin-disabled account stays
// disabled even after proving email ownership. One raw statement so the audit
// trigger logs a single update; updated_at is bumped by the DB ON UPDATE default.
const markVerified = async (id) =>
  sequelize.query(
    "UPDATE `users` SET `email_verified` = 1, `status` = IF(`status` = 'pending', 'active', `status`) WHERE `id` = ?",
    { replacements: [id] },
  );

const updatePassword = async (id, plainNewPassword) => {
  const hash = await hashPassword(plainNewPassword);
  return User.update({ passwordHash: hash }, { where: { id } });
};

const updateProfile = async (id, { name, avatarUrl }) =>
  User.update({ name: name || undefined, avatarUrl: avatarUrl || undefined }, { where: { id } });

const touchLastLogin = async (id) => User.update({ lastLoginAt: new Date() }, { where: { id } });

const setStatus = async (id, status) => User.update({ status }, { where: { id } });

module.exports = { User, findById, findByEmail, createUser, markVerified, updatePassword, updateProfile, touchLastLogin, setStatus, publicUser };
