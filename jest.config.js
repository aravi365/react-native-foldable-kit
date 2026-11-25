module.exports = {
  preset: '@react-native/jest-preset',
  testMatch: ['<rootDir>/src/__tests__/**/*.test.tsx'],
  modulePathIgnorePatterns: ['<rootDir>/lib/', '<rootDir>/example/'],
};
