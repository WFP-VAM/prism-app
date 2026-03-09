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
    // Ensure English UI so "Gauge station" and other labels match (Mozambique may default to Portuguese)
    cy.get('[aria-label="language-select-dropdown-button"]', { timeout: 10000 })
      .scrollIntoView()
      .click({ force: true });
    cy.get('[aria-label="language-select-dropdown-menu-item-en"]')
      .should('be.visible')
      .click();
    cy.get('.react-datepicker-wrapper button span', { timeout: 20000 }).should(
      'have.text',
      'Sep 1, 2025',
    );
    cy.get('header').contains('A. Actions').click();
    cy.get('div.MuiPopover-paper, [role="menu"]').contains('A. Action Flood').click();
    cy.url().should('include', 'anticipatory_action_flood');
    cy.contains(/Loading flood data|River gauge status overview|Gauge station/, {
      timeout: 30000,
    }).should('be.visible');
    cy.get('.react-datepicker-wrapper button span', { timeout: 20000 })
      .invoke('text')
      .then(aaDate => {
        expect(aaDate).to.match(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/);
        expect(new Date(aaDate).getTime()).to.be.greaterThan(
          new Date('Sep 1, 2025').getTime(),
        );
      });
  });
});
