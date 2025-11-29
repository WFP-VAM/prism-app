import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables that start with REACT_APP_
dotenv.config({ path: '.env' });
const env = Object.keys(process.env)
  .filter(key => key.startsWith('REACT_APP_'))
  .reduce(
    (obj, key) => {
      // eslint-disable-next-line fp/no-mutation, no-param-reassign
      obj[key] = process.env[key];
      return obj;
    },
    {} as { [key: string]: string | undefined },
  );

const country = env.REACT_APP_COUNTRY || 'mozambique';
if (country) {
  // eslint-disable-next-line no-console
  console.log(
    `Building for country ${country}. Removing data for other countries.`,
  );
}

// In case GIT_HASH is not set we are in github actions environment
// eslint-disable-next-line fp/no-mutation
process.env.REACT_APP_GIT_HASH = (
  process.env.GITHUB_SHA || process.env.GIT_HASH
)?.slice(0, 8);

// Custom plugin to remove files and empty directories
const removeFilesPlugin = (): Plugin => ({
  name: 'vite-plugin-remove-files',
  closeBundle() {
    const root = path.resolve(__dirname, 'build', 'data');
    const regex = new RegExp(country.toLowerCase(), 'm');

    const removeFiles = (dir: string) => {
      fs.readdirSync(dir).forEach(file => {
        const absPath = path.join(dir, file);
        if (fs.statSync(absPath).isDirectory()) {
          removeFiles(absPath);
        } else if (!regex.test(absPath)) {
          fs.unlinkSync(absPath);
        }
      });
    };

    const removeEmptyDirs = (dir: string): void => {
      if (!fs.existsSync(dir)) {
        return;
      }

      let files = fs.readdirSync(dir);

      // Process subdirectories first
      // eslint-disable-next-line no-restricted-syntax
      for (const file of files) {
        const absPath = path.join(dir, file);
        if (fs.statSync(absPath).isDirectory()) {
          removeEmptyDirs(absPath);
        }
      }

      // Re-read to see if directory is now empty after removing subdirs
      // eslint-disable-next-line fp/no-mutation
      files = fs.readdirSync(dir);
      if (files.length === 0) {
        fs.rmdirSync(dir);
      }
    };

    if (fs.existsSync(root)) {
      removeFiles(root);
      removeEmptyDirs(root);
    }
  },
});

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), nodePolyfills(), removeFilesPlugin()],
  define: {
    'process.env': env,
  },
  build: {
    outDir: 'build',
  },
  server: {
    allowedHosts: true,
    port: 3000,
    // Prevent the browser from opening automatically in docker
    open: false,
    host: true,
  },
  resolve: {
    alias: {
      components: '/src/components',
      config: '/src/config',
      context: '/src/context',
      utils: '/src/utils',
      muiTheme: '/src/muiTheme',
      i18n: '/src/i18n',
      fonts: '/src/fonts',
      serviceWorker: '/src/serviceWorker',
      src: '/src',
      test: '/test',
      public: '/public',
    },
  },
});
