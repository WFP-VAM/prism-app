// run cypress tests with:
// - `yarn cypress open` to run interactively/debug
// - `npx cypress run` for a headless run (like in CI)
const frontendUrl = 'http://localhost:3000';

describe('Loading layers', () => {
  // sample test that runs on Mozambique
  it('checks that dates are loaded', () => {
    cy.visit(frontendUrl);

    cy.contains('Rainfall').click();
    cy.contains('INAM Rainfall Data').click();
    cy.get('[type="checkbox"][aria-label="Rainfall aggregate"]').click();

    cy.url().should('include', 'hazardLayerIds=precip_blended_dekad');
  });
});
