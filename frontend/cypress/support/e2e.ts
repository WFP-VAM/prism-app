// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

import './commands';

// Log failed network requests to help debug CI issues
const failedRequests: string[] = [];

beforeEach(() => {
  // Clear failed requests before each test
  failedRequests.length = 0;

  cy.intercept('**/*', req => {
    req.on('response', res => {
      if (res.statusCode >= 400) {
        const msg = `❌ ${res.statusCode} - ${req.url}`;
        failedRequests.push(msg);
        Cypress.log({
          name: 'Network Error',
          message: msg,
          consoleProps: () => ({
            'Status Code': res.statusCode,
            URL: req.url,
            Method: req.method,
            Headers: res.headers,
          }),
        });
      }
    });
  });
});

afterEach(function () {
  // Log summary of failed requests after each test (especially useful on failure)
  if (failedRequests.length > 0) {
    // eslint-disable-next-line no-console
    console.log('=== Failed Network Requests ===');
    failedRequests.forEach(msg => {
      // eslint-disable-next-line no-console
      console.log(msg);
    });
    // eslint-disable-next-line no-console
    console.log('===============================');
  }
});
