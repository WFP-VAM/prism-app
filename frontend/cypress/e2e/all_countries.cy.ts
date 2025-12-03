// tests that should pass on all country deployments

describe('General stability', () => {
  it('should start without hanging and show the map', () => {
    cy.viewport(1280, 720); // Ensure desktop viewport
    cy.visit('http://localhost:3000');
    cy.contains('MapTiler', { timeout: 10000 }).should('be.visible');
    cy.get('[aria-label="language-select-dropdown-button"]').click();
    cy.get('[aria-label="language-select-dropdown-menu-item-en"]').click();
    cy.contains('Layers').should('be.visible');
  });
});
