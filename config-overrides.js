const {
  override,
  disableChunk,
  useEslintRc,
  addWebpackPlugin,
} = require('customize-cra');
const path = require('path');
const RemovePlugin = require('remove-files-webpack-plugin');

const country = process.env.REACT_APP_COUNTRY;

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
