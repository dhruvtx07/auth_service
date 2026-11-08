const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const { config } = require('../config/env');
const { logger } = require('../utils/logger');

const BREVO_HOST = 'smtp-relay.brevo.com';
const BREVO_PORT = 587;

const isConfigured = () => !config.isTest && Boolean(config.mail.smtpUser && config.mail.smtpKey);

/** Test/dev capture: every simulated email is stored here so tests can extract tokens. */
const sentMails = [];

const recordSimulated = ({ to, subject, html }) => sentMails.push({ to, subject, html, at: new Date() });

const createTransport = () => nodemailer.createTransport({
  host: BREVO_HOST,
  port: BREVO_PORT,
  secure: false,
  auth: { user: config.mail.smtpUser, pass: config.mail.smtpKey },
});

// ── Template loading & rendering ───────────────────────────────
// Templates are standalone HTML files in the service-root storage/ folder
// (backend/storage/email-templates/) — a dev can open one directly in the
// browser and see a fully-styled preview using the {{placeholder|sample}}
// fallbacks baked into the file.

const TEMPLATES_DIR = path.resolve(__dirname, '..', '..', 'storage', 'email-templates');

const templateCache = new Map();

const loadTemplate = (name) => {
  if (!templateCache.has(name)) {
    const file = path.join(TEMPLATES_DIR, `${name}.html`);
    if (!fs.existsSync(file)) throw new Error(`Email template not found: ${file}`);
    templateCache.set(name, fs.readFileSync(file, 'utf8'));
  }
  return templateCache.get(name);
};

/** Replaces {{key}} with data[key]; `{{key|Sample}}` falls back to the sample when key is absent. */
const render = (templateName, data = {}) =>
  loadTemplate(templateName).replace(
    /\{\{\s*([a-zA-Z0-9_]+)\s*(?:\|\s*([^}]*?))?\s*\}\}/g,
    (_match, key, fallback) => {
      const value = data[key];
      if (value !== undefined && value !== null) return String(value);
      if (fallback !== undefined) return fallback;
      logger.warn(`⚠️ email template "${templateName}": no value and no fallback for "${key}"`);
      return '';
    },
  );

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** Common per-mail data — name/email are user input, always HTML-escaped. */
const userData = (user) => ({ name: escapeHtml(user.name), email: escapeHtml(user.email) });

// ── transports ────────────────────────────────────────────────
/**
 * topic explains WHY the mail exists — shows up in the log line
 * (storage/logs/app.log) so an email trail can be audited without DB access.
 */
const sendMail = async ({ to, subject, html, topic = 'unspecified' }) => {
  if (!isConfigured()) {
    recordSimulated({ to, subject, html });
    logger.info(`📧 [mail not configured] Would send "${subject}" to ${to} — topic: ${topic} (simulated)`);
    return { simulated: true };
  }
  const result = await createTransport().sendMail({ from: config.mail.from, to, subject, html });
  logger.info(`📧 Email sent "${subject}" to ${to} — topic: ${topic}${result.messageId ? ` (id: ${result.messageId})` : ''}`);
  return { simulated: false, messageId: result.messageId };
};

const sendVerificationEmail = (user, token) => {
  const link = `${config.frontendUrl}/verify-email?token=${token}`;
  const html = render('verification', { ...userData(user), link, expiry: '24 hours' });
  return sendMail({ to: user.email, subject: 'Verify your email', html, topic: 'email-verification' });
};

const sendResetEmail = (user, token) => {
  const link = `${config.frontendUrl}/reset-password?token=${token}`;
  const html = render('reset-password', { ...userData(user), link, expiry: '1 hour' });
  return sendMail({ to: user.email, subject: 'Reset your password', html, topic: 'password-reset' });
};

module.exports = { sendVerificationEmail, sendResetEmail, isConfigured, sentMails, render, TEMPLATES_DIR };
