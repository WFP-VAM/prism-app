// tests that should pass on all country deployments

const frontendUrl = 'http://localhost:3000';

describe('General stability', () => {
  it('should start without hanging and show the map', () => {
    cy.visit(frontendUrl);
    cy.contains('MapTiler', { timeout: 10000 }).should('be.visible');
    cy.get('[aria-label="language-select-dropdown-button"]').click();
    cy.get('[aria-label="language-select-dropdown-menu-item-en"]').click();
    cy.contains('Layers').should('be.visible');
  });
});
