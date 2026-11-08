/**
 * 006 — oauth_accounts_audit + triggers (DB writes old/new values, app does NOTHING)
 * Run: npx sequelize-cli db:migrate
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE \`oauth_accounts_audit\` (
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
      CREATE TRIGGER \`oauth_accounts_audit_update\`
      AFTER UPDATE ON \`oauth_accounts\` FOR EACH ROW
      INSERT INTO \`oauth_accounts_audit\` (record_id, action, old_values, new_values)
      VALUES (OLD.\`id\`, 'update',
              JSON_OBJECT('id', OLD.\`id\`,
                          'user_id', OLD.\`user_id\`,
                          'provider', OLD.\`provider\`,
                          'provider_user_id', OLD.\`provider_user_id\`,
                          'created_at', OLD.\`created_at\`,
                          'updated_at', OLD.\`updated_at\`),
              JSON_OBJECT('id', NEW.\`id\`,
                          'user_id', NEW.\`user_id\`,
                          'provider', NEW.\`provider\`,
                          'provider_user_id', NEW.\`provider_user_id\`,
                          'created_at', NEW.\`created_at\`,
                          'updated_at', NEW.\`updated_at\`))
    `);

    await queryInterface.sequelize.query(`
      CREATE TRIGGER \`oauth_accounts_audit_delete\`
      AFTER DELETE ON \`oauth_accounts\` FOR EACH ROW
      INSERT INTO \`oauth_accounts_audit\` (record_id, action, old_values, new_values)
      VALUES (OLD.\`id\`, 'delete',
              JSON_OBJECT('id', OLD.\`id\`,
                          'user_id', OLD.\`user_id\`,
                          'provider', OLD.\`provider\`,
                          'provider_user_id', OLD.\`provider_user_id\`,
                          'created_at', OLD.\`created_at\`,
                          'updated_at', OLD.\`updated_at\`),
              NULL)
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS `oauth_accounts_audit_update`');
    await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS `oauth_accounts_audit_delete`');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS `oauth_accounts_audit`');
  },
};
