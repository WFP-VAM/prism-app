import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jest-environment-jsdom',
  globalSetup: '<rootDir>/test/global-setup.cjs',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        transformIgnorePatterns: [
          '<rootDir>/node_modules/(?!(.*\\.mjs$|quick-lru))',
        ],
        babelConfig: true,
        useESM: true,
      },
    ],
    '^.+\\.js$': 'babel-jest', // Handle .js files with Babel
    '^.+\\.mjs$': 'babel-jest', // Add this line to handle .mjs files
    // process `*.tsx` files with `ts-jest`
  },
  transformIgnorePatterns: ['<rootDir>/node_modules/(?!(quick-lru)/)'],
  moduleNameMapper: {
    '\\.(jpg|ico|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/test/fileMock.ts',
    '\\.(css|less)$': '<rootDir>/test/fileMock.ts',
  },
  setupFilesAfterEnv: ['<rootDir>/test/setupTests.ts'],
  moduleDirectories: ['node_modules', 'src'],
  roots: ['<rootDir>'],
  modulePaths: ['<rootDir>'],
  // Ignore Playwright e2e tests - they should only be run by Playwright
  testPathIgnorePatterns: [
    '/node_modules/',
    '.*/playwright/.*', // Match any path containing playwright/
    '/build/',
    '/dist/',
  ],
};

export default config;
