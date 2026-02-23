module.exports = {
  preset: 'jest-expo',
  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)',
    '**/__tests__/**/*-test.[jt]s?(x)',
    '**/*.test.[jt]s?(x)',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // Exclude StyledText snapshot test from default run (React teardown can cause exit 1 in Node)
  testPathIgnorePatterns: ['/node_modules/', 'StyledText-test'],
  collectCoverageFrom: ['src/**/*.ts', 'app/**/*.tsx', 'components/**/*.tsx'].filter(Boolean),
};
