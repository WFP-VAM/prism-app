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

    cy.get('.maplibregl-canvas', { timeout: 60000 }).should('exist');
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
    cy.get('.react-datepicker-wrapper button span', { timeout: 20000 }).should(
      $span => {
        const aaDate = $span.text();
        expect(aaDate).to.match(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/);
        expect(new Date(aaDate).getTime()).to.be.greaterThan(
          new Date('Sep 1, 2025').getTime(),
        );
      },
    );
    cy.get('#full-width-tabpanel-anticipatory_action_flood')
      .contains('Gauge station', { timeout: 10000 })
      .should('be.visible');
  });
});
