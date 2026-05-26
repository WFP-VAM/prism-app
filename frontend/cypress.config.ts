import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    // CI runners are slow; layer dates (preprocessed-layer-dates.json, WMS) can take 30s+
    defaultCommandTimeout: 45000,
    setupNodeEvents(on, config) {
      // Forward cy.task('log', ...) messages to the terminal so they
      // appear in GitHub Actions (headless) output.  cy.log() only
      // writes to the Cypress Command Log, which is invisible in CI.
      on('task', {
        log(message: string) {
          // eslint-disable-next-line no-console
          console.log(message);
          return null;
        },
      });
    },
  },
});
