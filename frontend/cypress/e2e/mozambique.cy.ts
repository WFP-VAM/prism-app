// run cypress tests with:
// - `yarn cypress open` to run interactively/debug
// - `npx cypress run` for a headless run (like in CI)
const frontendUrl = 'http://localhost:3000';

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

    cy.visit(`${frontendUrl}/?hazardLayerIds=rainfall_dekad&date=2025-09-01`);

    cy.get('.maplibregl-canvas', { timeout: 60000 }).should('exist');
    cy.get('.react-datepicker-wrapper button span', { timeout: 20000 }).then(
      span1 => {
        cy.wrap(span1)
          .invoke('text')
          .should('match', /^Sep 1, 2025$/)
          .as('initialDate');
      },
    );

    // Log what the app state looks like before switching to AA
    cy.window().then(win => {
      cy.log(
        '** Redux state before AA switch **',
      );
      // @ts-expect-error - accessing Redux store for diagnostics
      const state = win.__REDUX_DEVTOOLS_EXTENSION__
        ? 'devtools available'
        : 'no devtools';
      cy.log(`DevTools: ${state}`);
    });

    cy.get('header').contains('A. Actions').click();
    cy.get('div.MuiPopover-paper').contains('A. Action Flood').click();

    // ── Diagnostic: log intercepted flood API calls ──────────────────
    // Give the app time to dispatch the fetch, then log what happened.
    cy.wait(3000);

    // Check if dates.json was even requested
    cy.get('@floodApi.all').then(interceptions => {
      const calls = interceptions as unknown as Cypress.Intercept[];
      cy.log(`** Flood API calls intercepted: ${calls.length} **`);
      calls.forEach((call, i) => {
        const req = (call as any).request;
        const res = (call as any).response;
        cy.log(
          `  [${i}] ${req?.method} ${req?.url} → ${res?.statusCode ?? 'no response'}`,
        );
        if (res?.statusCode && res.statusCode >= 400) {
          cy.log(`  [${i}] Response body: ${JSON.stringify(res.body).slice(0, 200)}`);
        }
      });
    });

    // Log whether the datepicker is present in the DOM at all
    cy.get('body').then($body => {
      const dpExists = $body.find('.react-datepicker-wrapper').length > 0;
      cy.log(`** Datepicker in DOM: ${dpExists} **`);

      // Also check the date-selector container visibility conditions
      const dateSelector = $body.find('[class*="datePickerContainer"]');
      cy.log(`** DateSelector container found: ${dateSelector.length > 0} **`);
    });

    cy.get('.react-datepicker-wrapper button span', { timeout: 20000 }).then(
      span1 => {
        cy.wrap(span1)
          .invoke('text')
          .should('match', /^[A-Z][a-z]{2} \d{1,2}, \d{4}$/)
          .as('aaDate')
          .then(function () {
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
