const userModel = require('../models/user.model');
const emailTokenModel = require('../models/email-token.model');
const tokenService = require('./token.service');
const mailService = require('./mail.service');
const { hashPassword, comparePassword, randomToken } = require('../utils/crypto');
const { badRequest, conflict, unauthorized, forbidden } = require('../utils/error');
const { sha256 } = require('../utils/crypto');

const VERIFY_TTL_HOURS = 24;
const RESET_TTL_HOURS = 1;

const issueVerifyToken = async (user) => {
  await emailTokenModel.invalidatePending({ userId: user.id, type: 'verify' });
  const token = randomToken();
  await emailTokenModel.create({ userId: user.id, type: 'verify', token: sha256(token), expiresAt: tokenService.makeEmailTokenExpiry(VERIFY_TTL_HOURS) });
  await mailService.sendVerificationEmail(user, token);
  return token;
};

const issueResetToken = async (user) => {
  await emailTokenModel.invalidatePending({ userId: user.id, type: 'reset' });
  const token = randomToken();
  await emailTokenModel.create({ userId: user.id, type: 'reset', token: sha256(token), expiresAt: tokenService.makeEmailTokenExpiry(RESET_TTL_HOURS) });
  await mailService.sendResetEmail(user, token);
  return token;
};

const registerUser = async ({ email, name, password }) => {
  const existing = await userModel.findByEmail(email);
  if (existing) throw conflict('An account with this email already exists. Try logging in.');

  // Email signup starts 'pending' — 'markVerified' releases it to 'active'
  // once the email is verified. Google OAuth users start active.
  const user = await userModel.createUser({
    email,
    name,
    passwordHash: await hashPassword(password),
    status: 'pending',
  });
  await issueVerifyToken(user);
  return userModel.publicUser(user);
};

const verifyEmailToken = async (rawToken) => {
  const record = await emailTokenModel.findValidByToken({ token: sha256(rawToken), type: 'verify' });
  if (!record) throw badRequest('This verification link is invalid, expired or already used.');
  await emailTokenModel.markUsed(record.id);
  await userModel.markVerified(record.userId);
  return userModel.publicUser(await userModel.findById(record.userId));
};

const resendVerification = async (email) => {
  const user = await userModel.findByEmail(email);
  // Generic response on purpose: never reveal whether the email exists.
  // Only the email-verified flag gates resending: 'pending' accounts (and any
  // legacy unverified ones) are allowed to (re)request the link.
  if (user && !user.emailVerified) await issueVerifyToken(user);
  return true;
};

const loginUser = async ({ email, password }) => {
  const user = await userModel.findByEmail(email);
  const passwordOk = user && user.passwordHash && (await comparePassword(password, user.passwordHash));
  if (!passwordOk) throw unauthorized('Invalid email or password');

  // 'pending' and legacy unverified accounts get the verify hint; a verified,
  // admin-disabled account gets the disable message.
  if (!user.emailVerified || user.status === 'pending') throw forbidden('EMAIL_NOT_VERIFIED', 'Please verify your email before logging in. Check your inbox for the verification link.');
  if (user.status === 'disabled') throw forbidden('ACCOUNT_DISABLED', 'This account has been disabled.');

  return userModel.publicUser(user);
};

const requestPasswordReset = async (email) => {
  const user = await userModel.findByEmail(email);
  // Generic response on purpose: never reveal whether the email exists.
  // status==='active' excludes both 'pending' and 'disabled' accounts — reset
  // assumes a verified account; unverified users must verify their email first.
  if (user && user.status === 'active') await issueResetToken(user);
  return true;
};

const resetPassword = async ({ token, password }) => {
  const record = await emailTokenModel.findValidByToken({ token: sha256(token), type: 'reset' });
  if (!record) throw badRequest('This reset link is invalid, expired or already used.');

  await emailTokenModel.markUsed(record.id);
  await userModel.updatePassword(record.userId, password); // model hashes internally
  await tokenService.revokeAllForUser(record.userId); // log out all sessions
  return userModel.publicUser(await userModel.findById(record.userId));
};

module.exports = {
  registerUser,
  verifyEmailToken,
  resendVerification,
  loginUser,
  requestPasswordReset,
  resetPassword,
};
