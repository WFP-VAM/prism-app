// tests specific to cambodia

const frontendUrl = 'http://localhost:3000';

describe('Date picker', () => {
  it('should move to the previous/next observation date when clicking back/forward on the timeline', () => {
    cy.visit(frontendUrl);
    cy.contains('MapTiler', { timeout: 10000 }).should('be.visible');
    cy.get('[aria-label="language-select-dropdown-button"]').click();
    cy.get('[aria-label="language-select-dropdown-menu-item-en"]').click();
    cy.contains('Layers').should('be.visible');

    cy.toggleLayer('Rainfall', 'Rainfall Amount', 'Rainfall aggregate');

    cy.get('.react-datepicker-wrapper button span', { timeout: 20000 }).then(
      span1 => {
        cy.wrap(span1)
          .invoke('text')
          .should('match', /^[A-Z][a-z]{2} \d{1,2}, \d{4}$/)
          .as('initialDate');
        // scroll backwards once
        cy.get('button#chevronLeftButton').click();
        cy.get('.react-datepicker-wrapper button span', {
          timeout: 20000,
        }).then(function (span) {
          // do not use arrow functions, or the alias won't be available
          // validate that a dekad date is selected
          cy.wrap(span).should('contain.text', '1,');
        });
      },
    );
  });
});
