/* eslint-disable fp/no-mutation */
const {
  override,
  disableChunk,
  useEslintRc,
  addWebpackPlugin,
} = require('customize-cra');
const path = require('path');
const RemovePlugin = require('remove-files-webpack-plugin');

const country = process.env.REACT_APP_COUNTRY || 'mozambique';

// In case GIT_HASH is not set we are in github actions environment
process.env.REACT_APP_GIT_HASH = (
  process.env.GITHUB_SHA || process.env.GIT_HASH
)?.slice(0, 8);

module.exports = override(
  useEslintRc(path.resolve(__dirname, '.eslintrc')),
  disableChunk(),
  !!country &&
    addWebpackPlugin(
      new RemovePlugin({
        after: {
          root: './build',
          test: [
            {
              folder: './data',
              method: absPath =>
                !new RegExp(country.toLowerCase(), 'm').test(absPath),
              recursive: true,
            },
          ],
        },
      }),
    ),
);
