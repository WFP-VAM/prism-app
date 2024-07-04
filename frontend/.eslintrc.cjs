module.exports = {
  extends: [
    'react-app',
    'airbnb',
    'plugin:jsx-a11y/recommended',
    'prettier',
    'plugin:react/jsx-runtime',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['jsx-a11y', 'fp', 'prettier', 'import'],
  rules: {
    // TODO: enable before merging
    // 'react-refresh/only-export-components': [
    //   'warn',
    //   { allowConstantExport: true },
    // ],
    // Allow JSX within .js files
    'react/jsx-filename-extension': [
      1,
      { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
    ],
    // TODO: remove these
    'no-unused-variable': 'off',
    '@typescript-eslint/no-unused-vars': 'off',

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
        allowedObjects: ['_'],
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
    'no-console': ['warn', { allow: ['warn', 'error'] }],

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
    'no-unused-vars': 'off',
    // '@typescript-eslint/no-unused-vars': ['error'],
    'no-use-before-define': 'off',
    '@typescript-eslint/no-use-before-define': ['error'],
    'no-shadow': 'off',
    '@typescript-eslint/no-shadow': 'warn',
    'react/prop-types': 'off',
  },
  settings: {
    'import/resolver': {
      node: {
        moduleDirectory: ['node_modules', './src'],
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
    typescript: {
      // always try to resolve types under `<roo/>@types` directory even it doesn't contain any source code, like `@types/unist`
      alwaysTryTypes: true,
    },
  },
  globals: {
    NodeJS: true,
    RequestInit: true,
    RequestInfo: true,
    GeoJSON: true,
  },
};
