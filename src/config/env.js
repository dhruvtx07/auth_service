// Test env uses its own database + secrets: .env loads first, .env.test overrides when NODE_ENV=test
// Paths resolved from this file's location — CWD-independent (jest globalSetup runs elsewhere)

// Single source of truth for ALL timestamps = UTC.
// Must run before anything else formats a Date (winston, HTTP headers, new Date()).
process.env.TZ = 'UTC';

const path = require('path');

const loadDotEnv = () => {
  const dotenv = require('dotenv');
  const envFile = path.resolve(__dirname, '../../.env');
  const testEnvFile = path.resolve(__dirname, '../../.env.test');
  dotenv.config({ path: envFile });
  if (process.env.NODE_ENV === 'test') {
    dotenv.config({ path: testEnvFile, override: true });
  }
};

loadDotEnv();

const toInt = (value, fallback) => (Number.isNaN(Number(value)) ? fallback : Number(value));

const toList = (value) => (value || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const buildCors = () => ({
  origins: toList(process.env.CORS_ORIGIN || 'http://localhost:5173'),
});

const buildJwt = () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET,
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  accessTtlMinutes: toInt(process.env.ACCESS_TOKEN_TTL_MINUTES, 15),
  refreshTtlDays: toInt(process.env.REFRESH_TOKEN_TTL_DAYS, 7),
});

const buildDb = () => ({
  host: process.env.DB_HOST || '127.0.0.1',
  port: toInt(process.env.DB_PORT, 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  name: process.env.DB_NAME || 'auth_service',
  dialect: process.env.DB_DIALECT || 'mariadb',
  logQueries: process.env.DB_LOG_QUERIES !== 'false', // opt-in SQL echo (default: off)
});

const buildGoogle = () => ({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI,
});

const buildMail = () => ({
  smtpUser: process.env.BREVO_SMTP_USER,
  smtpKey: process.env.BREVO_SMTP_KEY,
  from: process.env.MAIL_FROM || 'Auth Service <no-reply@example.com>',
});

const buildLogsDir = () => {
  const raw = (process.env.LOGS_DIR || 'logs').trim();
  // Absolute paths pass through untouched; relative paths anchor to the service
  // root (backend/) — never to process.cwd(), so it resolves identically no
  // matter where node/npm is started from (jest globalSetup, pm2, terminal…).
  return path.isAbsolute(raw) ? raw : path.resolve(__dirname, '..', '..', raw);
};

const config = {
  env: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  port: toInt(process.env.PORT, 4000),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  cors: buildCors(),
  db: buildDb(),
  jwt: buildJwt(),
  google: buildGoogle(),
  mail: buildMail(),
  // Log directory (app.log / error.log): LOGS_DIR, default `logs` in backend/
  logsDir: buildLogsDir(),
};

module.exports = { config };
