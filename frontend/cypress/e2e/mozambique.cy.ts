// run cypress tests with:
// - `yarn cypress open` to run interactively/debug
// - `npx cypress run` for a headless run (like in CI)
// - `yarn cypress:ci-repro` to reproduce CI-like failures (short timeouts)
//
// Timeout overrides (to simulate slow CI): CYPRESS_MOZAMBIQUE_TIMEOUT_MS,
// CYPRESS_MOZAMBIQUE_DATEPICKER_TIMEOUT_MS, CYPRESS_MOZAMBIQUE_GAUGE_TIMEOUT_MS
const defaultTimeout = Number(Cypress.env('MOZAMBIQUE_TIMEOUT_MS')) || 60000;
const datepickerTimeout = Number(Cypress.env('MOZAMBIQUE_DATEPICKER_TIMEOUT_MS')) || 20000;
// AA flood data can be slow in CI; allow up to 30s for the panel to be ready
const gaugeTimeout = Number(Cypress.env('MOZAMBIQUE_GAUGE_TIMEOUT_MS')) || 30000;

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
    cy.visit(`${frontendUrl}/?hazardLayerIds=rainfall_dekad&date=2025-09-01`);

    cy.get('.maplibregl-canvas', { timeout: defaultTimeout }).should('exist');
    // Ensure English UI so "Gauge station" and other labels match (Mozambique may default to Portuguese)
    cy.get('[aria-label="language-select-dropdown-button"]', { timeout: 10000 })
      .scrollIntoView()
      .click({ force: true });
    cy.get('[aria-label="language-select-dropdown-menu-item-en"]')
      .should('be.visible')
      .click();
    cy.get('.react-datepicker-wrapper button span', { timeout: datepickerTimeout }).then(
      span1 => {
        cy.wrap(span1)
          .invoke('text')
          .should('match', /^Sep 1, 2025$/)
          .as('initialDate');
      },
    );
    cy.get('header').contains('A. Actions').click();
    cy.get('div.MuiPopover-paper, [role="menu"]').contains('A. Action Flood').click();
    // AA flood layer is added to URL immediately; no dependency on external flood API
    cy.url().should('include', 'anticipatory_action_flood');
    // Wait for AA dates to load (dates.json) and datepicker to show; skip "Gauge station"
    // which requires flood data API that is slow/unreliable in CI
    cy.get('.react-datepicker-wrapper button span', { timeout: gaugeTimeout })
      .should($span => {
        const aaDate = $span.text();
        expect(aaDate).to.match(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/);
        expect(new Date(aaDate).getTime()).to.be.greaterThan(
          new Date('Sep 1, 2025').getTime(),
        );
      });
  });
});
