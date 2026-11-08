/**
 * 007 — refresh_tokens_audit + triggers (DB writes old/new values, app does NOTHING)
 * Run: npx sequelize-cli db:migrate
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE \`refresh_tokens_audit\` (
        id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        record_id   BIGINT UNSIGNED NOT NULL,
        action      ENUM('update','delete') NOT NULL,
        old_values  LONGTEXT NOT NULL,
        new_values  LONGTEXT NULL,
        created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_audit_record (record_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryInterface.sequelize.query(`
      CREATE TRIGGER \`refresh_tokens_audit_update\`
      AFTER UPDATE ON \`refresh_tokens\` FOR EACH ROW
      INSERT INTO \`refresh_tokens_audit\` (record_id, action, old_values, new_values)
      VALUES (OLD.\`id\`, 'update',
              JSON_OBJECT('id', OLD.\`id\`,
                          'user_id', OLD.\`user_id\`,
                          'token_hash', OLD.\`token_hash\`,
                          'expires_at', OLD.\`expires_at\`,
                          'revoked_at', OLD.\`revoked_at\`,
                          'user_agent', OLD.\`user_agent\`,
                          'ip', OLD.\`ip\`,
                          'created_at', OLD.\`created_at\`,
                          'updated_at', OLD.\`updated_at\`),
              JSON_OBJECT('id', NEW.\`id\`,
                          'user_id', NEW.\`user_id\`,
                          'token_hash', NEW.\`token_hash\`,
                          'expires_at', NEW.\`expires_at\`,
                          'revoked_at', NEW.\`revoked_at\`,
                          'user_agent', NEW.\`user_agent\`,
                          'ip', NEW.\`ip\`,
                          'created_at', NEW.\`created_at\`,
                          'updated_at', NEW.\`updated_at\`))
    `);

    await queryInterface.sequelize.query(`
      CREATE TRIGGER \`refresh_tokens_audit_delete\`
      AFTER DELETE ON \`refresh_tokens\` FOR EACH ROW
      INSERT INTO \`refresh_tokens_audit\` (record_id, action, old_values, new_values)
      VALUES (OLD.\`id\`, 'delete',
              JSON_OBJECT('id', OLD.\`id\`,
                          'user_id', OLD.\`user_id\`,
                          'token_hash', OLD.\`token_hash\`,
                          'expires_at', OLD.\`expires_at\`,
                          'revoked_at', OLD.\`revoked_at\`,
                          'user_agent', OLD.\`user_agent\`,
                          'ip', OLD.\`ip\`,
                          'created_at', OLD.\`created_at\`,
                          'updated_at', OLD.\`updated_at\`),
              NULL)
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS `refresh_tokens_audit_update`');
    await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS `refresh_tokens_audit_delete`');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS `refresh_tokens_audit`');
  },
};
