const mailService = require('../../services/mail.service');
const { RefreshToken } = require('../../models');
const { post, extractCookie, assertSuccess } = require('./api');

const VALID_USER = { name: 'Test User', email: 'test.user@example.com', password: 'Password123!' };

/** Pulls the raw token the mail service captured for a given subject. */
const extractTokenFromMail = (subjectPart) => {
  const mail = mailService.sentMails.find((entry) => entry.subject.includes(subjectPart));
  expect(mail).toBeTruthy();
  return mail.html.match(/token=([a-f0-9]{64})/)[1];
};

/** Registers + verifies a user through the public API, returns its credentials. */
const createVerifiedUser = async (overrides = {}) => {
  const user = { ...VALID_USER, ...overrides };
  mailService.sentMails.length = 0;

  const registerRes = await post('/auth/register', user);
  assertSuccess(registerRes, 201);

  const token = extractTokenFromMail('Verify');
  const verifyRes = await post('/auth/verify-email', { token });
  assertSuccess(verifyRes);

  return { ...user, publicUser: registerRes.body.data.user };
};

const login = async (user) => {
  const res = await post('/auth/login', { email: user.email, password: user.password });
  assertSuccess(res);
  return { res, accessCookie: extractCookie(res, 'access_token'), refreshCookie: extractCookie(res, 'refresh_token') };
};

const countRefreshTokens = async () =>
  (await RefreshToken.findAll()).length;

module.exports = { VALID_USER, createVerifiedUser, login, extractTokenFromMail, countRefreshTokens };
