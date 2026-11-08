const { resetDatabase } = require('./helpers/db');
const { post, assertSuccess, assertError } = require('./helpers/api');
const { VALID_USER } = require('./helpers/fixtures');

beforeEach(resetDatabase);

describe('POST /api/v1/auth/register', () => {
  it('happy path: registers an unverified user and sends a verification email', async () => {
    const res = await post('/auth/register', VALID_USER);
    const body = assertSuccess(res, 201);

    expect(body.data.user.email).toBe(VALID_USER.email);
    expect(body.data.user.emailVerified).toBe(false);
    expect(body.data.user.status).toBe('pending'); // must verify email before it can be used
    expect(body.data.user).not.toHaveProperty('passwordHash');
    expect(body.message).toMatch(/check your inbox/i);
  });

  it('negative: rejects duplicate email with 409', async () => {
    await post('/auth/register', VALID_USER);
    const res = await post('/auth/register', VALID_USER);
    assertError(res, 409, 'CONFLICT');
  });

  it('negative: rejects an invalid email with validation details', async () => {
    const res = await post('/auth/register', { ...VALID_USER, email: 'not-an-email' });
    const body = assertError(res, 400, 'BAD_REQUEST');
    expect(body.error.details.some((detail) => detail.field === 'email')).toBe(true);
  });

  it('negative: rejects a too-short password', async () => {
    const res = await post('/auth/register', { ...VALID_USER, password: 'short' });
    const body = assertError(res, 400, 'BAD_REQUEST');
    expect(body.error.details.some((detail) => detail.field === 'password')).toBe(true);
  });

  it('negative: rejects missing name', async () => {
    const res = await post('/auth/register', { email: VALID_USER.email, password: VALID_USER.password });
    const body = assertError(res, 400, 'BAD_REQUEST');
    expect(body.error.details.some((detail) => detail.field === 'name')).toBe(true);
  });

  it('negative: stores the password hashed, never in plain text', async () => {
    const { User } = require('../models');
    await post('/auth/register', VALID_USER);
    const row = await User.findOne({ where: { email: VALID_USER.email } });

    expect(row.passwordHash).toBeTruthy();
    expect(row.passwordHash).toMatch(/^\$2[aby]\$/); // bcrypt format: salt is inside the hash
    expect(row.passwordHash).not.toBe(VALID_USER.password);
  });
});
