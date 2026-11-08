const { resetDatabase } = require('./helpers/db');
const { post, assertSuccess, assertError } = require('./helpers/api');
const { createVerifiedUser, login } = require('./helpers/fixtures');

beforeEach(resetDatabase);

describe('POST /api/v1/auth/login', () => {
  it('happy path: logs a verified user in and sets both cookies', async () => {
    const user = await createVerifiedUser();
    const { res, accessCookie, refreshCookie } = await login(user);

    const body = assertSuccess(res, 200);
    expect(body.data.user.email).toBe(user.email);
    expect(accessCookie).toMatch(/^access_token=/);
    expect(refreshCookie).toMatch(/^refresh_token=/);
  });

  it('negative: unknown email → generic 401 (no user enumeration)', async () => {
    const res = await post('/auth/login', { email: 'ghost@example.com', password: 'Whatever123' });
    const body = assertError(res, 401, 'UNAUTHORIZED');
    expect(body.message).toMatch(/invalid email or password/i);
  });

  it('negative: wrong password → 401', async () => {
    const user = await createVerifiedUser();
    const res = await post('/auth/login', { email: user.email, password: 'WrongPass999' });
    assertError(res, 401, 'UNAUTHORIZED');
  });

  it('negative: unverified email → 403 with a verify hint', async () => {
    await post('/auth/register', { name: 'Pending', email: 'pending@example.com', password: 'Password123!' });
    const res = await post('/auth/login', { email: 'pending@example.com', password: 'Password123!' });
    const body = assertError(res, 403, 'EMAIL_NOT_VERIFIED');
    expect(body.message).toMatch(/verify your email/i);
  });

  it('negative: disabled account → 403', async () => {
    const { User } = require('../models');
    const user = await createVerifiedUser();
    await User.update({ status: 'disabled' }, { where: { email: user.email }, individualHooks: true });

    const res = await post('/auth/login', { email: user.email, password: user.password });
    assertError(res, 403, 'ACCOUNT_DISABLED');
  });

  it('negative: validation error on malformed payload', async () => {
    const res = await post('/auth/login', { email: 'nope' });
    assertError(res, 400, 'BAD_REQUEST');
  });
});
