import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    // Default command timeout - increased for CI environments
    defaultCommandTimeout: 20000,
    // Page load timeout - increased for CI environments
    pageLoadTimeout: 60000,
  },
});
