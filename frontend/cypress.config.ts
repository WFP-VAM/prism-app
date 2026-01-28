import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    // Default command timeout - can be overridden by CYPRESS_DEFAULT_COMMAND_TIMEOUT env var
    // Increased for CI environments which tend to be slower
    defaultCommandTimeout: 20000,
  },
});
