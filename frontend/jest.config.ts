import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  // TODO: remove testMatch
  testMatch: ['**/TimelineLabel/index.test.tsx'],
  testEnvironment: 'jest-environment-jsdom',
  globalSetup: '<rootDir>/test/global-setup.cjs',
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
    // process `*.tsx` files with `ts-jest`
  },
  moduleNameMapper: {
    '\\.(jpg|ico|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/test/fileMock.ts',
    '\\.(css|less)$': '<rootDir>/test/fileMock.ts',
  },
  setupFilesAfterEnv: ['<rootDir>/test/setupTests.ts'],
  moduleDirectories: ['node_modules', 'src'],
  roots: ['<rootDir>'],
  modulePaths: ['<rootDir>'],
  snapshotSerializers: ['enzyme-to-json/serializer'],
};

export default config;