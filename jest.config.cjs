module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  modulePathIgnorePatterns: [
    '<rootDir>/build/',
    '<rootDir>/node_modules/',
  ],
  transform: {
    "^.+\\.ts?$": "babel-jest",
  },
  roots: ['<rootDir>'],
  modulePaths: ['<rootDir>'],
  moduleDirectories: ['node_modules'],
  moduleNameMapper: {
    "@app/(.*)": '<rootDir>/src/$1',
  }
};
