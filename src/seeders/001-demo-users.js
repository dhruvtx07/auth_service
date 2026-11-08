/**
 * Demo seed users (dev only). Safe to re-run — seeds only when absent.
 * Run: npx sequelize-cli db:seed:all
 */
const bcrypt = require('bcryptjs');

const DEMO_PASSWORD = 'Demo1234!';

const buildDemoUsers = async (queryInterface) => {
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const existing = await queryInterface.sequelize.query(
    'SELECT email FROM users WHERE email IN (:a, :b)',
    { replacements: { a: 'demo@example.com', b: 'pending@example.com' }, type: queryInterface.sequelize.QueryTypes.SELECT },
  );
  const taken = new Set(existing.map((row) => row.email));

  const rows = [];
  if (!taken.has('demo@example.com')) {
    rows.push({ email: 'demo@example.com', name: 'Demo User', email_verified: 1 });
  }
  if (!taken.has('pending@example.com')) {
    rows.push({ email: 'pending@example.com', name: 'Pending User', email_verified: 0 });
  }
  return rows.map((row) => ({
    ...row,
    password_hash: hash,
    auth_provider: 'email',
    // explicit: bypasses the fail-closed 'pending' DB default so demo logins work
    status: 'active',
    created_at: new Date(),
    updated_at: new Date(),
  }));
};

module.exports = {
  async up(queryInterface) {
    const rows = await buildDemoUsers(queryInterface);
    if (!rows.length) {
      console.log('⏭  Demo users already exist, skipping.');
      return;
    }
    await queryInterface.bulkInsert('users', rows);
    console.log(`🌱 Seeded demo users (password: ${DEMO_PASSWORD})`);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('users', { email: ['demo@example.com', 'pending@example.com'] });
  },
};
