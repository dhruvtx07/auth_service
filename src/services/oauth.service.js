const { config } = require('../config/env');
const { randomToken } = require('../utils/crypto');
const { forbidden } = require('../utils/error');
const userModel = require('../models/user.model');
const oauthAccountModel = require('../models/oauth-account.model');

const PROVIDER = 'google';
const SCOPE = 'openid email profile';
const STATE_COOKIE = 'oauth_state';
const STATE_MAX_AGE_MS = 10 * 60 * 1000;

const buildAuthUrl = () => {
  const state = randomToken();
  const params = new URLSearchParams({
    client_id: config.google.clientId,
    redirect_uri: config.google.redirectUri,
    response_type: 'code',
    scope: SCOPE,
    state,
    prompt: 'select_account',
  });
  return { state, url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` };
};

const exchangeCodeForTokens = async (code) => {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.google.clientId,
      client_secret: config.google.clientSecret,
      redirect_uri: config.google.redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  if (!response.ok) throw new Error(`Google token exchange failed: ${await response.text()}`);
  return response.json();
};

const fetchProfile = async (accessToken) => {
  const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error(`Google profile fetch failed: ${await response.text()}`);
  return response.json();
};

const buildGoogleProfile = (payload) => ({
  providerUserId: String(payload.sub),
  email: String(payload.email || '').toLowerCase(),
  name: payload.name || (payload.email ? payload.email.split('@')[0] : 'Google User'),
  avatarUrl: payload.picture || null,
  emailVerifiedByGoogle: Boolean(payload.email_verified),
});

const createGoogleUser = async (profile) => {
  const user = await userModel.createUser({
    email: profile.email,
    name: profile.name,
    avatarUrl: profile.avatarUrl,
    authProvider: PROVIDER,
    // Google has verified the email (userinfo email_verified) — born usable,
    // while email/username signups stay 'pending' via the model default.
    status: 'active',
  });
  await oauthAccountModel.create({ userId: user.id, provider: PROVIDER, providerUserId: profile.providerUserId });
  return user;
};

const linkGoogleToUser = async (user, profile) => {
  await oauthAccountModel.create({ userId: user.id, provider: PROVIDER, providerUserId: profile.providerUserId });
  if (!user.emailVerified) await userModel.markVerified(user.id);
  if (!user.avatarUrl || !user.name) await userModel.updateProfile(user.id, profile);
  return userModel.findById(user.id);
};

const findOrCreateGoogleUser = async (profile) => {
  const linked = await oauthAccountModel.findByProviderUser(PROVIDER, profile.providerUserId);
  if (linked) return userModel.findById(linked.userId);

  const existing = await userModel.findByEmail(profile.email);
  return existing ? linkGoogleToUser(existing, profile) : createGoogleUser(profile);
};

const loginWithGoogle = async (code) => {
  const tokens = await exchangeCodeForTokens(code);
  const payload = await fetchProfile(tokens.access_token);
  const profile = buildGoogleProfile(payload);

  if (!profile.email) throw forbidden('OAUTH_NO_EMAIL', 'Google account did not return an email address');
  const user = await findOrCreateGoogleUser(profile);
  return userModel.publicUser(user);
};

module.exports = { buildAuthUrl, loginWithGoogle, STATE_COOKIE, STATE_MAX_AGE_MS };
