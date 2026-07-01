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
    '^react-dom$': '<rootDir>/src/shims/react-dom.ts',
    '^react-dom-vendor$': '<rootDir>/node_modules/react-dom',
    '\\.(jpg|ico|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/test/fileMock.ts',
    '\\.(css|less)$': '<rootDir>/test/fileMock.ts',
    '^test/(.*)$': '<rootDir>/test/$1',
    '^components/MapView/Layers/COGLayer$':
      '<rootDir>/test/deckGlComponentMock.tsx',
    '^components/MapView/Layers/ZarrLayer$':
      '<rootDir>/test/deckGlComponentMock.tsx',
    '^components/MapView/DeckGLOverlay$':
      '<rootDir>/test/deckGlComponentMock.tsx',
    '^@deck\\.gl/(.*)$': '<rootDir>/test/fileMock.ts',
    '^@developmentseed/(.*)$': '<rootDir>/test/fileMock.ts',
    '^@luma\\.gl/(.*)$': '<rootDir>/test/fileMock.ts',
  },
  setupFilesAfterEnv: ['<rootDir>/test/setupTests.ts'],
  moduleDirectories: ['node_modules', 'src'],
  roots: ['<rootDir>'],
  modulePaths: ['<rootDir>'],
};

export default config;
