// tests specific to cambodia

const frontendUrl = 'http://localhost:3000';

describe('Date picker', () => {
  it('should move to the previous/next observation date when clicking back/forward on the timeline, with rainfall then EWS layer active', () => {
    cy.visit(frontendUrl);

    cy.contains('MapTiler', { timeout: 20000 }).should('be.visible');
    cy.switchLanguage('en');

    cy.activateLayer('Rainfall', 'Rainfall Amount', 'Rainfall aggregate');

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
        }).then(span => {
          // validate that a dekad date is selected
          cy.wrap(span).should('contain.text', '1,');
        });
      },
    );

    cy.activateLayer('Flood', 'Early Warning', 'EWS 1294 river level data');
    // cy.get('button#chevronLeftButton').click();
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
        }).then(span => {
          cy.wrap(span)
            .invoke('text')
            .as('newDate')
            .then(function () {
              // dekad can be 10 or 11 days apart
              expect([10, 11]).to.include(
                (new Date(this.initialDate) - new Date(this.newDate)) /
                  (24 * 60 * 60 * 1000),
              );
            });
        });
      },
    );
  });

  it('KOBO layer dates should load ok', () => {
    // mock api calls
    // make sure to use a regex, the string matcher does not work somehow
    cy.intercept(
      { method: 'GET', url: /^https:\/\/prism-api\.ovio\.org\/kobo\/dates.*/ },
      {
        fixture: 'mocks/kobo/dates/get.json',
      },
    ).as('getKoboDates');
    cy.intercept(
      { method: 'GET', url: /^https:\/\/prism-api\.ovio\.org\/kobo\/forms.*/ },
      {
        fixture: 'mocks/kobo/forms/get.json',
      },
    ).as('getKoboForms');
    cy.visit(frontendUrl);

    cy.wait('@getKoboDates', { timeout: 10000 });
    cy.contains('MapTiler', { timeout: 10000 }).should('be.visible');
    cy.switchLanguage('en');

    cy.activateLayer('Field Reports', 'Field Reports', 'Flood report');
    cy.get('input#username').type('aaa');
    cy.get('input#password').type('bbb');
    cy.contains('Send').click();
    cy.wait('@getKoboForms', { timeout: 10000 });
    cy.get('.react-datepicker-wrapper button span', {
      timeout: 20000,
    }).then(span => {
      // validate that a dekad date is selected
      cy.wrap(span).should('contain.text', 'Aug 25, 2025');
    });
    cy.get('#chevronLeftButton').click();
    cy.get('.react-datepicker-wrapper button span', {
      timeout: 20000,
    }).then(span => {
      // validate that a dekad date is selected
      cy.wrap(span).should('contain.text', 'Aug 8, 2025');
    });
  });

  it('should find a valid date when activating / deactivating and reactivating a layer with date', () => {
    cy.visit(frontendUrl);

    cy.contains('MapTiler', { timeout: 20000 }).should('be.visible');
    cy.switchLanguage('en');
    cy.activateLayer('Rainfall', 'Rainfall Amount', 'Rainfall aggregate');
    cy.get('.react-datepicker-wrapper button span', {
      timeout: 20000,
    }).then(span => {
      cy.wrap(span)
        .invoke('text')
        .should('match', /^[A-Z][a-z]{2} \d{1,2}, \d{4}$/)
        .as('initialDate');
      const initialDate = span.text();

      // deactivate the layer
      cy.deactivateLayer('Rainfall', 'Rainfall Amount', 'Rainfall aggregate');
      cy.get('.react-datepicker-wrapper button span').should('not.exist');

      // reactivate the layer
      cy.activateLayer('Rainfall', 'Rainfall Amount', 'Rainfall aggregate');
      cy.get('.react-datepicker-wrapper button span', {
        timeout: 2000,
      }).then(span1 => {
        cy.wrap(span1).should('contain.text', initialDate);
      });
      cy.contains('Invalid date found undefined').should('not.exist');
    });
  });
});
