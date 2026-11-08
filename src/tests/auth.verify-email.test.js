const { resetDatabase } = require('./helpers/db');
const { post, assertSuccess, assertError } = require('./helpers/api');
const { extractTokenFromMail } = require('./helpers/fixtures');
const { EmailToken, User } = require('../models');
const { sha256 } = require('../utils/crypto');

const NAME = 'Vera';
const PASSWORD = 'Password123!';

beforeEach(resetDatabase);

describe('POST /api/v1/auth/verify-email', () => {
  it('happy path: valid token → verified + logged in (cookies issued)', async () => {
    const email = 'verify.me@example.com';
    await post('/auth/register', { name: NAME, email, password: PASSWORD });
    const token = extractTokenFromMail('Verify');

    const res = await post('/auth/verify-email', { token });
    const body = assertSuccess(res, 200);

    expect(res.headers['set-cookie'].some((cookie) => cookie.startsWith('access_token='))).toBe(true);
    expect(body.data.user.emailVerified).toBe(true);

    const row = await User.findOne({ where: { email } });
    expect(row.emailVerified).toBe(true);
    expect(row.status).toBe('active'); // verification releases the pending account
  });

  it('edge: admin-disabled account verifies email but stays disabled (no session)', async () => {
    const email = 'admin.disabled@example.com';
    await post('/auth/register', { name: NAME, email, password: PASSWORD });
    const { User } = require('../models');
    await User.update({ status: 'disabled' }, { where: { email } });

    const token = extractTokenFromMail('Verify');
    const res = await post('/auth/verify-email', { token });
    assertSuccess(res, 200);

    const row = await User.findOne({ where: { email } });
    expect(row.emailVerified).toBe(true);   // email ownership proven
    expect(row.status).toBe('disabled');    // admin decision stands
    expect(res.headers['set-cookie']).toBeUndefined(); // no session issued
  });

  it('negative: reused token is rejected', async () => {
    await post('/auth/register', { name: NAME, email: 'reuse@example.com', password: PASSWORD });
    const token = extractTokenFromMail('Verify');

    assertSuccess(await post('/auth/verify-email', { token }));
    assertError(await post('/auth/verify-email', { token }), 400, 'BAD_REQUEST');
  });

  it('negative: tampered token is rejected', async () => {
    await post('/auth/register', { name: NAME, email: 'tamper@example.com', password: PASSWORD });
    const forged = 'f'.repeat(64);
    assertError(await post('/auth/verify-email', { token: forged }), 400, 'BAD_REQUEST');
  });

  it('negative: expired token is rejected', async () => {
    await post('/auth/register', { name: NAME, email: 'expired@example.com', password: PASSWORD });
    const row = await User.findOne({ where: { email: 'expired@example.com' } });
    await EmailToken.create({
      userId: row.id,
      type: 'verify',
      tokenHash: sha256('e'.repeat(64)),
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    });

    const res = await post('/auth/verify-email', { token: 'e'.repeat(64) });
    assertError(res, 400, 'BAD_REQUEST');
  });

  it('negative: missing token → validation error', async () => {
    const res = await post('/auth/verify-email', {});
    assertError(res, 400, 'BAD_REQUEST');
  });
});
