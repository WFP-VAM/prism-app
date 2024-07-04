import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import dotenv from 'dotenv';

// Load environment variables that start with REACT_APP_
dotenv.config({ path: '.env' });
const env = Object.keys(process.env)
  .filter(key => key.startsWith('REACT_APP_'))
  .reduce((obj, key) => {
    obj[key] = process.env[key];
    return obj;
  }, {} as { [key: string]: string | undefined });

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), nodePolyfills()],
  define: {
    'process.env': env,
  },
  build: {
    outDir: 'build',
  },
  server: {
    port: 3000,
    open: true,
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
    },
  },
});
