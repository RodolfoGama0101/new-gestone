import nextJest from 'next/jest.js'

const createJestConfig = nextJest({
  dir: './',
})

const config = {
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/tests/e2e/', '<rootDir>/tests/rules/'],
}

export default createJestConfig(config)
