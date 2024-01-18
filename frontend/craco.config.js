const path = require('path');
const RemovePlugin = require('remove-files-webpack-plugin');

const country = process.env.REACT_APP_COUNTRY;

// In case GIT_HASH is not set we are in github actions environment
process.env.REACT_APP_GIT_HASH = (
  process.env.GITHUB_SHA || process.env.GIT_HASH
)?.slice(0, 8);

module.exports = {
  eslint: {
    configure: {
      useEslintRc: path.resolve(__dirname, '.eslintrc'),
    },
  },
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      // Disable chunk
      webpackConfig.optimization.splitChunks = false;
      webpackConfig.optimization.runtimeChunk = false;

      // Add webpack alias
      webpackConfig.resolve.alias = {
        ...webpackConfig.resolve.alias,
        stream: path.resolve(__dirname, 'node_modules', 'stream-browserify'),
      };

      // Add resolve fallback
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        util: false,
        buffer: false,
      };

      // Add webpack plugin
      if (country) {
        webpackConfig.plugins.push(
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
        );
      }

      return webpackConfig;
    },
  },
};
