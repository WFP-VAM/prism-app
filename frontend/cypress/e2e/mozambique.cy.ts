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
    cy.visit(`${frontendUrl}/?hazardLayerIds=rainfall_dekad&date=2025-09-01`);

    cy.waitForMapLoad({ timeout: 20000 });
    cy.get('.react-datepicker-wrapper button span', { timeout: 20000 }).then(
      span1 => {
        cy.wrap(span1)
          .invoke('text')
          .should('match', /^Sep 1, 2025$/)
          .as('initialDate');
      },
    );
    cy.get('header').contains('A. Actions').click();
    cy.get('div.MuiPopover-paper').contains('A. Action Flood').click();
    
    // Wait for AA Flood panel to be visible first (ensures layer has switched)
    cy.get('#full-width-tabpanel-anticipatory_action_flood', { timeout: 15000 })
      .should('be.visible');
    
    // The date selector may temporarily disappear while AA Flood dates are loading
    // Wait for gauge station content to ensure AA data is loaded
    cy.get('#full-width-tabpanel-anticipatory_action_flood')
      .contains('Gauge station', { timeout: 15000 })
      .should('be.visible');
    
    // Now the datepicker should be ready with AA Flood date loaded
    cy.get('.react-datepicker-wrapper button span', { timeout: 30000 })
      .should('be.visible')
      .then(span1 => {
        cy.wrap(span1)
          .invoke('text')
          .should('match', /^[A-Z][a-z]{2} \d{1,2}, \d{4}$/)
          .as('aaDate')
          .then(function () {
            const firstDate = new Date(this.initialDate).getTime();
            const secondDate = new Date(this.aaDate).getTime();
            expect(secondDate).to.be.greaterThan(firstDate);
          });
      });
  });
});
