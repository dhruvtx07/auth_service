const { resetDatabase } = require('./helpers/db');
const { get, assertSuccess } = require('./helpers/api');
const oauthService = require('../services/oauth.service');
const { config } = require('../config/env');

beforeEach(resetDatabase);

describe('GET /api/v1/oauth/google (redirect entry point)', () => {
  it('happy path: redirects to the Google consent screen with a state cookie', async () => {
    const res = await get('/oauth/google');

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('https://accounts.google.com/o/oauth2/v2/auth');
    expect(res.headers.location).toContain(`client_id=${encodeURIComponent(config.google.clientId)}`);
    expect(res.headers.location).toContain(`redirect_uri=${encodeURIComponent(config.google.redirectUri)}`);
    expect(res.headers['set-cookie'].some((cookie) => cookie.startsWith('oauth_state='))).toBe(true);
  });

  it('unit: buildAuthUrl() returns state + url pair', () => {
    const { url, state } = oauthService.buildAuthUrl();
    expect(state).toMatch(/^[a-f0-9]{64}$/);
    expect(url).toContain('scope=openid+email+profile');
    expect(url).toContain(`state=${state}`);
  });
});

describe('GET /api/v1/oauth/google/callback', () => {
  it('negative: state mismatch → redirects to frontend with an error', async () => {
    // no state cookie at all → mismatch
    const res = await request302('/oauth/google/callback?code=fake-code&state=mismatched-state');

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/oauth/callback?status=error');
  });
});

const request302 = async (path) => {
  const { get: rawGet } = require('./helpers/api');
  return rawGet(path);
};
