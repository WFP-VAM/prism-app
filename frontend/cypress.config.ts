import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // Forward cy.task('log', ...) messages to the terminal so they
      // appear in GitHub Actions (headless) output.  cy.log() only
      // writes to the Cypress Command Log, which is invisible in CI.
      on('task', {
        log(message: string) {
          console.log(message);
          return null;
        },
      });
    },
  },
});
