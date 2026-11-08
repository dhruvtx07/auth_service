const { resetDatabase } = require('./helpers/db');
const { post, get, extractCookie, assertSuccess, assertError } = require('./helpers/api');
const { createVerifiedUser, login } = require('./helpers/fixtures');

beforeEach(resetDatabase);

describe('GET /api/v1/auth/me (session)', () => {
  it('happy path: access cookie → returns the current user', async () => {
    const user = await createVerifiedUser();
    const { accessCookie } = await login(user);

    const res = await get('/auth/me', accessCookie);
    const body = assertSuccess(res, 200);
    expect(body.data.user.email).toBe(user.email);
    expect(body.data.user.emailVerified).toBe(true);
    // the response must never carry a full instance — password_hash stays hidden
    expect(body.data.user).not.toHaveProperty('passwordHash');
  });

  it('negative: no access token → 401', async () => {
    const res = await get('/auth/me');
    assertError(res, 401, 'UNAUTHORIZED');
  });

  it('negative: forged access token → 401', async () => {
    const forgedCookie = 'access_token=signed.with.wrongsecret';
    const res = await get('/auth/me', forgedCookie);
    assertError(res, 401, 'UNAUTHORIZED');
  });
});

describe('POST /api/v1/auth/refresh (rotation + reuse detection)', () => {
  const refresh = (cookie) => post('/auth/refresh', {}, cookie);

  it('happy path: rotates — new tokens issued, the old refresh token is burned', async () => {
    const user = await createVerifiedUser();
    const { refreshCookie } = await login(user);

    const first = await refresh(refreshCookie);
    const body = assertSuccess(first, 200);
    expect(first.headers['set-cookie'].some((cookie) => cookie.startsWith('refresh_token='))).toBe(true);
    expect(body.data.user.email).toBe(user.email);
    // no credential material in rotation responses either
    expect(body.data.user).not.toHaveProperty('passwordHash');
  });

  it('security: replaying an already-rotated refresh token → 401 AND revokes every session', async () => {
    const user = await createVerifiedUser();
    const login1 = await login(user);
    const login2 = await login(user);
    assertSuccess(await refresh(login1.refreshCookie)); // login1's token is now burned

    const replay = await refresh(login1.refreshCookie); // reuse attempt
    assertError(replay, 401, 'UNAUTHORIZED');

    // reuse detection revokes ALL of the user's tokens — even the untouched login2 one
    assertError(await refresh(login2.refreshCookie), 401);
  });

  it('security: tampered refresh token → 401', async () => {
    await createVerifiedUser();
    const res = await refresh('refresh_token=tampered.value');
    assertError(res, 401, 'UNAUTHORIZED');
  });

  it('negative: no refresh token at all → 401', async () => {
    assertError(await refresh(null), 401, 'UNAUTHORIZED');
  });
});

describe('POST /api/v1/auth/logout', () => {
  it('happy path: revokes the refresh token and clears cookies', async () => {
    const user = await createVerifiedUser();
    const { refreshCookie } = await login(user);

    const logoutRes = await post('/auth/logout', {}, refreshCookie);
    assertSuccess(logoutRes);

    // refresh after logout must fail — the token was revoked server-side
    assertError(await post('/auth/refresh', {}, refreshCookie), 401);
  });

  it('negative: logout without cookies still succeeds (graceful)', async () => {
    const res = await post('/auth/logout');
    assertSuccess(res);
  });
});
