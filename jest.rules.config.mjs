const config = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/rules'],
  testMatch: ['**/tests/rules/**/*.test.cjs'],
  testTimeout: 30000,
  maxWorkers: 1,
}

export default config
