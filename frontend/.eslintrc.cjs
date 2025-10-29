module.exports = {
  extends: [
    'react-app',
    'airbnb',
    'plugin:jsx-a11y/recommended',
    'prettier',
    'plugin:react/jsx-runtime',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['jsx-a11y', 'fp', 'prettier', 'import', 'react-refresh'],
  rules: {
    'react-refresh/only-export-components': 'error',
    // Allow JSX within .js files
    'react/jsx-filename-extension': [
      1,
      { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
    ],
    // Allow props spreading in React
    'react/jsx-props-no-spreading': 0,
    // Allow named exports only files
    'import/prefer-default-export': 0,
    'object-curly-spacing': [
      'error',
      'always',
      { arraysInObjects: true, objectsInObjects: true },
    ],
    // More verbose prettier suggestions
    'prettier/prettier': ['warn', { endOfLine: 'auto' }],
    'react/require-default-props': ['off'],
    'react/jsx-no-bind': ['warn'],
    'import/extensions': [
      'error',
      'ignorePackages',
      {
        js: 'never',
        jsx: 'never',
        ts: 'never',
        tsx: 'never',
      },
    ],
    // Warnings to enforce functional programming styles - e.g. no unintended mutations
    'fp/no-delete': 'warn',
    'fp/no-mutating-assign': 'warn',
    'fp/no-mutating-methods': [
      'warn',
      {
        allowedObjects: ['_', 'history'],
      },
    ],
    'fp/no-mutation': [
      'warn',
      {
        commonjs: true,
        allowThis: true,
        exceptions: [
          { property: 'propTypes' },
          { property: 'defaultProps' },
          { property: 'current' },
        ],
      },
    ],
    // temp: remove before merging PR
    'no-console': ['warn', { allow: ['warn', 'error', 'time', 'timeEnd', 'timeLog'] }],
    'lines-between-class-members': 'off',
    'max-classes-per-file': 'off',
    'spaced-comment': 'warn',
    curly: ['warn', 'all'],
    'import/no-cycle': 'error',
    'import/no-extraneous-dependencies': [
      'error',
      {
        devDependencies: true,
      },
    ],
    'no-underscore-dangle': 'off',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    'no-use-before-define': 'off',
    '@typescript-eslint/no-use-before-define': ['error'],
    'no-shadow': 'off',
    '@typescript-eslint/no-shadow': 'warn',
    'react/prop-types': 'off',
    'default-param-last': 'warn',
    // Configure jsx-a11y label-has-associated-control rule to allow inputs nested within labels
    'jsx-a11y/label-has-associated-control': [
      'error',
      {
        labelComponents: [],
        labelAttributes: [],
        controlComponents: [],
        assert: 'either',
        depth: 3,
      },
    ],
  },
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: `${__dirname}/tsconfig.json`,
      },
      node: {
        moduleDirectory: ['node_modules', './src', './public'],
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.svg', '.png', '.jpg', '.jpeg'],
      },
    },
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
  },
  globals: {
    cy: true,
    NodeJS: true,
    RequestInit: true,
    RequestInfo: true,
    GeoJSON: true,
  },
};
