const { sequelize } = require('../../config/database');
const mailService = require('../../services/mail.service');

const MAIN_TABLES = ['email_tokens', 'refresh_tokens', 'oauth_accounts', 'users'];
const AUDIT_TABLES = ['users_audit', 'oauth_accounts_audit', 'refresh_tokens_audit', 'email_tokens_audit'];
const TABLES = [...AUDIT_TABLES, ...MAIN_TABLES];

/** Truncates every table + clears captured mails so each test starts from a blank slate. */
const resetDatabase = async () => {
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const table of TABLES) await sequelize.query(`TRUNCATE TABLE ${table}`);
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
  mailService.sentMails.length = 0;
};

module.exports = { resetDatabase, TABLES };
