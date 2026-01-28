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

      for (const file of files) {
        const absPath = path.join(dir, file);
        if (fs.statSync(absPath).isDirectory()) {
          removeEmptyDirs(absPath);
        }
      }

      // Re-read to see if directory is now empty after removing subdirs

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

// Plugin to suppress Vite warnings about importing assets from public directory
const suppressPublicAssetWarningsPlugin = (): Plugin => ({
  name: 'vite-plugin-suppress-public-asset-warnings',
  buildStart() {
    // Override console.warn to filter out public asset warnings
    const originalWarn = console.warn;
    console.warn = (...args: any[]) => {
      const message = args.join(' ');
      if (
        message.includes('Assets in public directory cannot be imported') ||
        message.includes('use /images/') ||
        message.includes('?url')
      ) {
        // Suppress this warning
        return;
      }
      // Call original warn for other messages
      originalWarn.apply(console, args);
    };
  },
});

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills(),
    removeFilesPlugin(),
    suppressPublicAssetWarningsPlugin(),
  ],
  define: {
    'process.env': env,
  },
  build: {
    outDir: 'build',
    // Suppress warnings about importing assets from public directory
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress the specific warning about public directory assets
        if (
          warning.code === 'UNRESOLVED_IMPORT' ||
          (warning.message &&
            warning.message.includes(
              'Assets in public directory cannot be imported',
            ))
        ) {
          return;
        }
        // Use default warning handler for other warnings
        warn(warning);
      },
    },
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
