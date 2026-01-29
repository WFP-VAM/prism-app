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

// Key external domains to monitor
const MONITORED_DOMAINS = [
  'earthobservation.vam.wfp.org',
  'api.maptiler.com',
  'maptiler.com',
  'geonode',
  'wms',
  'wcs',
  'wfs',
];

const isMonitoredUrl = (url: string): boolean => {
  return MONITORED_DOMAINS.some(domain => url.includes(domain));
};

beforeEach(() => {
  // Clear logs before each test
  networkLog.length = 0;
  pendingRequests.clear();

  // Monitor all requests
  cy.intercept('**/*', req => {
    const isMonitored = isMonitoredUrl(req.url);
    const startTime = Date.now();

    if (isMonitored) {
      pendingRequests.set(req.url, startTime);
      const msg = `📤 REQUEST: ${req.method} ${req.url}`;
      networkLog.push(msg);
      // eslint-disable-next-line no-console
      console.log(msg);
    }

    req.on('response', res => {
      if (isMonitored) {
        const duration = Date.now() - startTime;
        pendingRequests.delete(req.url);
        const msg = `📥 RESPONSE: ${res.statusCode} ${req.url} (${duration}ms)`;
        networkLog.push(msg);
        // eslint-disable-next-line no-console
        console.log(msg);
      }

      // Log all errors regardless of domain
      if (res.statusCode >= 400) {
        const msg = `❌ ERROR ${res.statusCode}: ${req.url}`;
        networkLog.push(msg);
        // eslint-disable-next-line no-console
        console.log(msg);
      }
    });
  });
});

afterEach(function () {
  // Log any requests that never got a response (likely timeouts)
  if (pendingRequests.size > 0) {
    // eslint-disable-next-line no-console
    console.log('=== PENDING REQUESTS (no response received) ===');
    pendingRequests.forEach((startTime, url) => {
      const duration = Date.now() - startTime;
      const msg = `⏳ TIMEOUT/PENDING: ${url} (started ${duration}ms ago)`;
      // eslint-disable-next-line no-console
      console.log(msg);
      networkLog.push(msg);
    });
    // eslint-disable-next-line no-console
    console.log('================================================');
  }

  // Always log network summary for debugging
  // eslint-disable-next-line no-console
  console.log(`=== Network Summary: ${networkLog.length} logged events ===`);
  if (networkLog.length === 0) {
    // eslint-disable-next-line no-console
    console.log('(No monitored network requests were made)');
  }
});
