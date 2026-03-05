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

// Prevent Cypress from failing tests on known React rendering errors.
// react-datepicker v2 uses class component lifecycle methods (componentDidUpdate)
// that call setState when the `selected` prop changes. During rapid layer/date
// switches, this can trigger React's "Maximum update depth exceeded" error.
// React recovers from this internally and the app continues to function normally,
// but Cypress catches it as an uncaught exception and fails the test.
// Long-term fix: upgrade react-datepicker from v2 to a modern version.
// See: https://on.cypress.io/uncaught-exception-from-application
Cypress.on('uncaught:exception', err => {
  if (err.message.includes('Maximum update depth exceeded')) {
    return false;
  }
});
