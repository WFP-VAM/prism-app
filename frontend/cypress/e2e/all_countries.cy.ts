// tests that should pass on all country deployments

const frontendUrl = 'http://localhost:3000';

describe('General stability', () => {
  it('should start without hanging and show the map', () => {
    cy.visit(frontendUrl);
    cy.contains('Layers').should('be.visible');
    cy.contains('MapTiler', { timeout: 10000 }).should('be.visible');
  });
});
