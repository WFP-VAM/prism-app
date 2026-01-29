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

// Track network requests to help debug CI issues
const networkLog: string[] = [];
const pendingRequests: Map<string, number> = new Map();

// Key external domains to monitor - expanded list
const MONITORED_DOMAINS = [
  'earthobservation.vam.wfp.org',
  'api.maptiler.com',
  'maptiler.com',
  'tiles.maptiler.com',
  'geonode',
  'wms',
  'wcs',
  'wfs',
  'pbf', // Vector tiles
  'mvt', // MapBox Vector Tiles
];

const isMonitoredUrl = (url: string): boolean => {
  return MONITORED_DOMAINS.some(domain => url.includes(domain));
};

beforeEach(function () {
  // Log test start immediately
  cy.task('log', `\n🚀 STARTING TEST: ${Cypress.currentTest.title}`, {
    log: false,
  });

  // Clear logs before each test
  networkLog.length = 0;
  pendingRequests.clear();

  // Monitor all requests for debugging
  cy.intercept('**/*', req => {
    const isMonitored = isMonitoredUrl(req.url);
    const startTime = Date.now();

    if (isMonitored) {
      pendingRequests.set(req.url, startTime);
      networkLog.push(`📤 REQUEST: ${req.method} ${req.url}`);
    }

    req.on('response', res => {
      if (isMonitored) {
        const duration = Date.now() - startTime;
        pendingRequests.delete(req.url);
        networkLog.push(
          `📥 RESPONSE: ${res.statusCode} ${req.url} (${duration}ms)`,
        );
      }

      // Log all errors regardless of domain
      if (res.statusCode >= 400) {
        networkLog.push(`❌ ERROR ${res.statusCode}: ${req.url}`);
      }
    });
  });
});

afterEach(function () {
  // Log any requests that never got a response (likely timeouts)
  if (pendingRequests.size > 0) {
    networkLog.push('=== PENDING REQUESTS (no response received) ===');
    pendingRequests.forEach((startTime, url) => {
      const duration = Date.now() - startTime;
      networkLog.push(`⏳ TIMEOUT/PENDING: ${url} (started ${duration}ms ago)`);
    });
    networkLog.push('================================================');
  }

  // Output all logs to the terminal via cy.task
  const title = `\n=== Network Log for: ${Cypress.currentTest.title} ===`;
  cy.task('log', title, { log: false });

  if (networkLog.length === 0) {
    cy.task('log', '(No monitored network requests were made)', { log: false });
  } else {
    // Chain cy.task calls to output each log line
    networkLog.forEach(msg => {
      cy.task('log', msg, { log: false });
    });
  }

  cy.task('log', '='.repeat(50), { log: false });
});
