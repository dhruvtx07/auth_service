/** Jest config — tests run against the isolated .env.test environment (auth_service_test). */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src/tests'],
  testMatch: ['**/*.test.js'],
  testTimeout: 20000,
  clearMocks: true,
  // Creates auth_service_test, runs migrations, truncates tables — before any test module loads
  globalSetup: '<rootDir>/src/tests/setup/global-setup.js',
  // Keep suites sequential: they share one test database
  maxWorkers: 1,
  // Sequelize pools keep handles open — integration suite, force a clean exit
  forceExit: true,
};
