import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import importPlugin from 'eslint-plugin-import';
import fp from 'eslint-plugin-fp';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    ignores: [
      'node_modules/**',
      'build/**',
      'dist/**',
      '../common/**',
      'playwright/**',
    ],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest,
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        test: 'readonly',
        before: 'readonly',
        after: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        jest: 'readonly',
        NodeJS: 'readonly',
        RequestInit: 'readonly',
        RequestInfo: 'readonly',
        GeoJSON: 'readonly',
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'jsx-a11y': jsxA11y,
      import: importPlugin,
      fp,
      prettier,
      '@typescript-eslint': typescript,
    },
    settings: {
      react: {
        version: 'detect',
      },
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
        node: {
          moduleDirectory: ['node_modules', './src', './public'],
          extensions: [
            '.js',
            '.jsx',
            '.ts',
            '.tsx',
            '.svg',
            '.png',
            '.jpg',
            '.jpeg',
          ],
        },
      },
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx'],
      },
    },
    rules: {
      ...prettierConfig.rules,
      'react-refresh/only-export-components': 'error',
      'react/jsx-filename-extension': [
        1,
        { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
      ],
      'react/jsx-props-no-spreading': 0,
      'import/prefer-default-export': 0,
      'object-curly-spacing': [
        'error',
        'always',
        { arraysInObjects: true, objectsInObjects: true },
      ],
      'prettier/prettier': ['warn', { endOfLine: 'auto' }],
      'react/require-default-props': ['off'],
      'react/jsx-no-bind': ['off'], // Temporarily disabled - 190+ instances need fixing
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
      // Temporarily disabled fp rules - eslint-plugin-fp may not be fully compatible with ESLint 9 flat config
      // 'fp/no-delete': 'warn',
      // 'fp/no-mutating-assign': 'warn',
      // 'fp/no-mutating-methods': ['warn', { allowedObjects: ['_', 'history'] }],
      // 'fp/no-mutation': [
      //   'warn',
      //   {
      //     commonjs: true,
      //     allowThis: true,
      //     exceptions: [
      //       { property: 'propTypes' },
      //       { property: 'defaultProps' },
      //       { property: 'current' },
      //     ],
      //   },
      // ],
      'no-console': [
        'warn',
        { allow: ['warn', 'error', 'time', 'timeEnd', 'timeLog'] },
      ],
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
      '@typescript-eslint/no-use-before-define': [
        'warn', // Downgrade to warning - useStyles pattern is common with Material-UI
        {
          functions: false, // Allow function hoisting (common with hooks like useStyles)
          classes: true,
          variables: false, // Allow variables to be used before defined (needed for useStyles pattern)
          typedefs: true,
        },
      ],
      'no-shadow': 'off',
      '@typescript-eslint/no-shadow': 'warn',
      'react/prop-types': 'off',
      'default-param-last': 'warn',
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
      'react/react-in-jsx-scope': 'off',
      'react/jsx-runtime': 'off',
    },
  },
  {
    files: ['**/*.js', '**/*.jsx'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-use-before-define': 'off',
      '@typescript-eslint/no-shadow': 'off',
    },
  },
  {
    files: ['**/*.test.{js,jsx,ts,tsx}', '**/*.spec.{js,jsx,ts,tsx}'],
    rules: {
      '@typescript-eslint/no-use-before-define': 'off', // Tests often use variables before they're defined
    },
  },
  {
    files: ['playwright.config.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          args: 'none', // Allow unused function arguments in config files
        },
      ],
    },
  },
];
