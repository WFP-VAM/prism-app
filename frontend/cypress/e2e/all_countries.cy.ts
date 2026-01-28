// tests that should pass on all country deployments

describe('General stability', () => {
  beforeEach(() => {
    cy.viewport(1280, 720); // Ensure desktop viewport
    cy.log('🔵 Setting viewport to 1280x720');
  });

  it('should start without hanging and show the map', () => {
    cy.log('🔵 Starting test: should start without hanging and show the map');
    cy.log('🔵 Visiting: http://localhost:3000');
    cy.visit('http://localhost:3000');
    
    cy.window().then((win) => {
      cy.log(`🔵 Window location: ${win.location.href}`);
      cy.log(`🔵 Document ready state: ${win.document.readyState}`);
      cy.log(`🔵 Document title: ${win.document.title}`);
    });

    cy.log('🔵 Waiting for MapTiler to be visible (timeout: 20000ms)');
    cy.contains('MapTiler', { timeout: 20000 }).should('be.visible');
    cy.log('✅ MapTiler is visible');

    cy.log('🔵 Looking for language selector button (timeout: 20000ms)');
    cy.get('[aria-label="language-select-dropdown-button"]', {
      timeout: 20000,
    })
      .should('be.visible')
      .then(() => {
        cy.log('✅ Language selector button found');
      })
      .scrollIntoView()
      .click({ force: true });
    cy.log('✅ Language selector clicked');

    cy.log('🔵 Looking for English language option');
    cy.get('[aria-label="language-select-dropdown-menu-item-en"]')
      .should('be.visible')
      .then(() => {
        cy.log('✅ English language option found');
      })
      .click();
    cy.log('✅ English language selected');

    cy.log('🔵 Waiting for "Layers" text to appear');
    cy.contains('Layers').should('be.visible');
    cy.log('✅ Layers text is visible - test passed');
  });
});
