// tests that should pass on all country deployments

describe('General stability', () => {
  beforeEach(() => {
    cy.viewport(1280, 720); // Ensure desktop viewport
  });

  it('should start without hanging and show the map', () => {
    cy.visit('http://localhost:3000');
    // Verify the map container is present and the app has loaded
    cy.get('.maplibregl-map', { timeout: 10000 }).should('exist');
    cy.get('[aria-label="language-select-dropdown-button"]', {
      timeout: 10000,
    })
      .should('be.visible')
      .scrollIntoView()
      .click({ force: true });
    cy.get('[aria-label="language-select-dropdown-menu-item-en"]')
      .should('be.visible')
      .click();
    cy.contains('Layers').should('be.visible');
  });
});
