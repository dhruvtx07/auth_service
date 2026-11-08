/**
 * 005 — users_audit + triggers (DB writes old/new values, app does NOTHING)
 * Run: npx sequelize-cli db:migrate
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE \`users_audit\` (
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
      CREATE TRIGGER \`users_audit_update\`
      AFTER UPDATE ON \`users\` FOR EACH ROW
      INSERT INTO \`users_audit\` (record_id, action, old_values, new_values)
      VALUES (OLD.\`id\`, 'update',
              JSON_OBJECT('id', OLD.\`id\`,
                          'email', OLD.\`email\`,
                          'password_hash', OLD.\`password_hash\`,
                          'name', OLD.\`name\`,
                          'avatar_url', OLD.\`avatar_url\`,
                          'email_verified', OLD.\`email_verified\`,
                          'auth_provider', OLD.\`auth_provider\`,
                          'status', OLD.\`status\`,
                          'last_login_at', OLD.\`last_login_at\`,
                          'created_at', OLD.\`created_at\`,
                          'updated_at', OLD.\`updated_at\`),
              JSON_OBJECT('id', NEW.\`id\`,
                          'email', NEW.\`email\`,
                          'password_hash', NEW.\`password_hash\`,
                          'name', NEW.\`name\`,
                          'avatar_url', NEW.\`avatar_url\`,
                          'email_verified', NEW.\`email_verified\`,
                          'auth_provider', NEW.\`auth_provider\`,
                          'status', NEW.\`status\`,
                          'last_login_at', NEW.\`last_login_at\`,
                          'created_at', NEW.\`created_at\`,
                          'updated_at', NEW.\`updated_at\`))
    `);

    await queryInterface.sequelize.query(`
      CREATE TRIGGER \`users_audit_delete\`
      AFTER DELETE ON \`users\` FOR EACH ROW
      INSERT INTO \`users_audit\` (record_id, action, old_values, new_values)
      VALUES (OLD.\`id\`, 'delete',
              JSON_OBJECT('id', OLD.\`id\`,
                          'email', OLD.\`email\`,
                          'password_hash', OLD.\`password_hash\`,
                          'name', OLD.\`name\`,
                          'avatar_url', OLD.\`avatar_url\`,
                          'email_verified', OLD.\`email_verified\`,
                          'auth_provider', OLD.\`auth_provider\`,
                          'status', OLD.\`status\`,
                          'last_login_at', OLD.\`last_login_at\`,
                          'created_at', OLD.\`created_at\`,
                          'updated_at', OLD.\`updated_at\`),
              NULL)
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS `users_audit_update`');
    await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS `users_audit_delete`');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS `users_audit`');
  },
};
