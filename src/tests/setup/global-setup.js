/**
 * Jest global setup — prepares the isolated test database (.env.test):
 *  1. CREATE DATABASE auth_service_test
 *  2. Run all pending migrations (tracked in SequelizeMeta)
 *  3. Clear all tables (tests also reset before each test)
 */
const fs = require('fs');
const path = require('path');
const mariadb = require('mariadb');
const { config } = require('../../config/env');
const { sequelize } = require('../../config/database');

const MIGRATIONS_DIR = path.resolve(__dirname, '../../..', 'src', 'migrations');
const META_TABLE = 'SequelizeMeta';
const MAIN_TABLES = ['email_tokens', 'refresh_tokens', 'oauth_accounts', 'users'];
const AUDIT_TABLES = ['users_audit', 'oauth_accounts_audit', 'refresh_tokens_audit', 'email_tokens_audit'];
const DATA_TABLES = [...AUDIT_TABLES, ...MAIN_TABLES];

const createDatabase = async () => {
  const conn = await mariadb.createConnection({
    host: config.db.host, port: config.db.port, user: config.db.user, password: config.db.password,
  });
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${config.db.name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.end();
};

/** Drops every historical table/ledger so a fresh migration set can run. */
const wipeSchema = async () => {
  const conn = await mariadb.createConnection({
    host: config.db.host, port: config.db.port, user: config.db.user, password: config.db.password, database: config.db.name,
  });
  for (const trigger of ['users_audit_update', 'users_audit_delete', 'oauth_accounts_audit_update', 'oauth_accounts_audit_delete', 'refresh_tokens_audit_update', 'refresh_tokens_audit_delete', 'email_tokens_audit_update', 'email_tokens_audit_delete']) {
    await conn.query(`DROP TRIGGER IF EXISTS \`${trigger}\``).catch(() => {});
  }
  const tables = (await conn.query('SHOW TABLES')).map((row) => Object.values(row)[0]);
  await conn.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const table of tables) await conn.query(`DROP TABLE IF EXISTS \`${table}\``);
  await conn.query('SET FOREIGN_KEY_CHECKS = 1');
  await conn.end();
};

const ensureMetaTable = async () =>
  sequelize.query(`CREATE TABLE IF NOT EXISTS ${META_TABLE} (name VARCHAR(255) NOT NULL PRIMARY KEY)`);

const getApplied = async () => {
  const rows = await sequelize.query(`SELECT name FROM ${META_TABLE}`, { type: sequelize.QueryTypes.SELECT });
  return new Set(rows.map((row) => row.name));
};

const runMigrations = async () => {
  await ensureMetaTable();
  const applied = await getApplied();
  const files = fs.readdirSync(MIGRATIONS_DIR).filter((file) => file.endsWith('.js')).sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const migration = require(path.join(MIGRATIONS_DIR, file));
    await migration.up(sequelize.getQueryInterface());
    await sequelize.query(`INSERT INTO ${META_TABLE} (name) VALUES (?)`, { replacements: [file] });
    console.log(`migrated: ${file}`);
  }
};

const truncateDataTables = async () => {
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const table of DATA_TABLES) await sequelize.query(`TRUNCATE TABLE ${table}`);
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
};

module.exports = async () => {
  await createDatabase();
  await wipeSchema();
  await sequelize.authenticate();
  await runMigrations();
  await truncateDataTables();
  console.log('✅ test database ready');
};
