// run cypress tests with:
// - `yarn cypress open` to run interactively/debug
// - `npx cypress run` for a headless run (like in CI)
const frontendUrl = 'http://localhost:3000';

// Helper: cy.log() only writes to the Cypress Command Log and is
// invisible in CI headless output.  cy.task('log') writes to the
// Node process stdout so it shows up in GitHub Actions logs.
const ciLog = (msg: string) => cy.task('log', `[CYPRESS] ${msg}`);

describe('Loading layers', () => {
  // sample test that runs on Mozambique
  it('checks that dates are loaded', () => {
    cy.visit(frontendUrl);

    cy.activateLayer('Rainfall', 'INAM Rainfall Data', 'Rainfall aggregate');

    cy.url().should('include', 'hazardLayerIds=precip_blended_dekad');
  });
});

describe('Loading dates', () => {
  it('switching to AA from rainfall layer should load latest data', () => {
    // ── Diagnostic intercepts ──────────────────────────────────────────
    // Spy on every request to the AA Flood data host so CI logs show
    // whether they succeed, fail, or time-out.
    const floodBaseUrl =
      'https://data.earthobservation.vam.wfp.org/public-share/aa/flood/moz/*';

    cy.intercept({ method: 'GET', url: floodBaseUrl }).as('floodApi');

    // Also spy on WMS GetCapabilities / date-fetching requests
    cy.intercept({
      method: 'GET',
      url: /earthobservation\.vam\.wfp\.org.*?(GetCapabilities|wms)/,
    }).as('wmsApi');

    // ── Step 1: Load app with a rainfall layer ─────────────────────────
    // Don't hardcode a specific date – let the app pick the latest
    // available date from the WMS server.  A stale hardcoded date can
    // cause the DateSelector to hide when the server no longer serves it.
    cy.visit(`${frontendUrl}/?hazardLayerIds=rainfall_dekad`);

    cy.get('.maplibregl-canvas', { timeout: 60000 }).should('exist');

    // Wait for the datepicker to appear (dates loaded from WMS server)
    cy.get('.react-datepicker-wrapper button span', { timeout: 30000 }).then(
      span1 => {
        cy.wrap(span1)
          .invoke('text')
          .then(text => {
            ciLog(`Initial date shown: "${text}"`);
          })
          .should('match', /^[A-Z][a-z]{2} \d{1,2}, \d{4}$/)
          .as('initialDate');
      },
    );

    // ── Step 2: Switch to Anticipatory Action Flood ────────────────────
    ciLog('Clicking A. Actions menu...');
    cy.get('header').contains('A. Actions').click();
    cy.get('div.MuiPopover-paper').contains('A. Action Flood').click();
    ciLog('Clicked A. Action Flood');

    // ── Step 3: Diagnostic logging ─────────────────────────────────────
    // Wait for the network requests to fire and complete
    cy.wait(5000);

    // Log WMS calls
    cy.get('@wmsApi.all').then(interceptions => {
      const calls = interceptions as unknown as Cypress.Intercept[];
      ciLog(`WMS API calls intercepted: ${calls.length}`);
      calls.forEach((call, i) => {
        const req = (call as any).request;
        const res = (call as any).response;
        ciLog(
          `  WMS[${i}] ${req?.method} ${req?.url?.slice(0, 120)} → ${res?.statusCode ?? 'pending'}`,
        );
      });
    });

    // Log flood API calls
    cy.get('@floodApi.all').then(interceptions => {
      const calls = interceptions as unknown as Cypress.Intercept[];
      ciLog(`Flood API calls intercepted: ${calls.length}`);
      calls.forEach((call, i) => {
        const req = (call as any).request;
        const res = (call as any).response;
        ciLog(
          `  Flood[${i}] ${req?.method} ${req?.url?.slice(0, 120)} → ${res?.statusCode ?? 'pending'}`,
        );
        if (res?.statusCode && res.statusCode >= 400) {
          ciLog(
            `  Flood[${i}] ERROR body: ${JSON.stringify(res.body).slice(0, 200)}`,
          );
        }
      });
    });

    // Log DOM state
    cy.get('body').then($body => {
      const dpExists = $body.find('.react-datepicker-wrapper').length > 0;
      ciLog(`Datepicker wrapper in DOM: ${dpExists}`);

      const dateSelector = $body.find('[class*="datePickerContainer"]');
      ciLog(`DateSelector container found: ${dateSelector.length > 0}`);

      // Check if loading indicator is visible (dates still loading)
      const loadingIndicators = $body.find('[class*="loading"], [class*="Loading"], [role="progressbar"]');
      ciLog(`Loading indicators found: ${loadingIndicators.length}`);
    });

    // ── Step 4: Assert datepicker appears with AA date ─────────────────
    cy.get('.react-datepicker-wrapper button span', { timeout: 30000 }).then(
      span1 => {
        cy.wrap(span1)
          .invoke('text')
          .then(text => {
            ciLog(`AA date shown: "${text}"`);
          })
          .should('match', /^[A-Z][a-z]{2} \d{1,2}, \d{4}$/)
          .as('aaDate')
          .then(function () {
            ciLog(
              `Comparing dates: initial="${this.initialDate}" vs aa="${this.aaDate}"`,
            );
            const firstDate = new Date(this.initialDate).getTime();
            const secondDate = new Date(this.aaDate).getTime();
            expect(secondDate).to.be.greaterThan(firstDate);
          });
      },
    );

    cy.get('#full-width-tabpanel-anticipatory_action_flood')
      .contains('Gauge station', { timeout: 10000 })
      .should('be.visible');
  });
});
