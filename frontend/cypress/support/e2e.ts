// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

import './commands';

// Log environment info at the start of test run
before(() => {
  cy.log('🔵 ===== Test Run Starting =====');
  cy.log(`🔵 Cypress version: ${Cypress.version}`);
  cy.log(`🔵 Browser: ${Cypress.browser.name} ${Cypress.browser.version}`);
  cy.log(`🔵 Viewport: ${Cypress.config('viewportWidth')}x${Cypress.config('viewportHeight')}`);
  cy.log(`🔵 Default command timeout: ${Cypress.config('defaultCommandTimeout')}ms`);
  cy.log(`🔵 Base URL: ${Cypress.config('baseUrl') || 'not set'}`);
  cy.window().then((win) => {
    cy.log(`🔵 User agent: ${win.navigator.userAgent}`);
    cy.log(`🔵 Platform: ${win.navigator.platform}`);
  });
  cy.log('🔵 =============================');
});
