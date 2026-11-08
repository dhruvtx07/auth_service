const { resetDatabase } = require('./helpers/db');
const { post, extractCookie, assertSuccess, assertError } = require('./helpers/api');
const { login, extractTokenFromMail } = require('./helpers/fixtures');

const EMAIL = 'forgot.me@example.com';
const OLD_PASSWORD = 'OldPassword1!';
const NEW_PASSWORD = 'NewPassword999!';

const registerAndLogin = async () => {
  const registerRes = await post('/auth/register', { name: 'Freddy', email: EMAIL, password: OLD_PASSWORD });
  assertSuccess(registerRes, 201); // fail fast if registration itself breaks
  await post('/auth/verify-email', { token: extractTokenFromMail('Verify') });
  return login({ email: EMAIL, password: OLD_PASSWORD });
};

beforeEach(resetDatabase);

describe('password reset flow (forgot + reset)', () => {
  it('happy path: reset token → password changed → new password works, old does not', async () => {
    await registerAndLogin();

    assertSuccess(await post('/auth/forgot-password', { email: EMAIL }));
    const resetToken = extractTokenFromMail('Reset');
    expect(resetToken).toBeTruthy();

    const resetRes = await post('/auth/reset-password', { token: resetToken, password: NEW_PASSWORD });
    assertSuccess(resetRes);

    assertError(await post('/auth/login', { email: EMAIL, password: OLD_PASSWORD }), 401);
    assertSuccess(await post('/auth/login', { email: EMAIL, password: NEW_PASSWORD }));
  });

  it('happy path: resetting the password revokes existing refresh sessions', async () => {
    const { refreshCookie } = await registerAndLogin();
    assertSuccess(await post('/auth/refresh', {}, refreshCookie)); // works before reset

    await post('/auth/forgot-password', { email: EMAIL });
    await post('/auth/reset-password', { token: extractTokenFromMail('Reset'), password: NEW_PASSWORD });

    assertError(await post('/auth/refresh', {}, refreshCookie), 401);
  });

  it('negative: unknown email still returns generic 200 (no user enumeration)', async () => {
    const res = await post('/auth/forgot-password', { email: 'ghost@example.com' });
    const body = assertSuccess(res);
    expect(body.message).toMatch(/if an account exists/i);
  });

  it('negative: reused reset token is rejected', async () => {
    await registerAndLogin();
    await post('/auth/forgot-password', { email: EMAIL });
    const resetToken = extractTokenFromMail('Reset');

    assertSuccess(await post('/auth/reset-password', { token: resetToken, password: NEW_PASSWORD }));
    assertError(await post('/auth/reset-password', { token: resetToken, password: NEW_PASSWORD }), 400);
  });

  it('negative: too-short new password is rejected', async () => {
    await registerAndLogin();
    await post('/auth/forgot-password', { email: EMAIL });

    const res = await post('/auth/reset-password', { token: extractTokenFromMail('Reset'), password: 'short' });
    assertError(res, 400, 'BAD_REQUEST');
  });
});
