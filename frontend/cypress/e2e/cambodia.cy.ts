// tests specific to cambodia

const frontendUrl = 'http://localhost:3000';

describe('Date picker', () => {
  beforeEach(() => {
    cy.viewport(1280, 720); // Ensure desktop viewport
  });

  it('should move to the previous/next observation date when clicking back/forward on the timeline, with rainfall then EWS layer active', () => {
    // mock tiles as we don't really need them here
    cy.intercept(
      {
        method: 'GET',
        url: /^https:\/\/api\.earthobservation\.vam\.wfp\.org\/ows\/\/wms\?bboxsr=.*/,
      },
      { fixture: 'mocks/vam_empty_tile.png' },
    ).as('mockVAMtiles');
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
        cy.scrollLeft();
        cy.get('.react-datepicker-wrapper button span', {
          timeout: 20000,
        }).then(span => {
          // validate that a dekad date is selected
          cy.wrap(span)
            .invoke('text')
            .as('newDate')
            .then(function () {
              const dekadStartDates = [1, 11, 21];
              // const firstDate = new Date(this.initialDate).getDate();
              const secondDate = new Date(this.newDate).getDate();
              // expect(dekadStartDates).to.include(firstDate);
              expect(dekadStartDates).to.include(secondDate);
            });
        });
      },
    );

    // load a layer with daily updates, scrolling should now move by
    // a single day only
    cy.activateLayer('Flood', 'Early Warning', 'EWS 1294 river level data');
    // wait on the url to prevent the scrollLeft action from happening too quickly in CI
    cy.url({ timeout: 20000 }).should('include', 'ews_remote');
    // wait for the timeline to show layer data (indicated by layerOneEmphasis element)
    // This ensures the layer dates are loaded before proceeding
    cy.get('[role="presentation"][class*="layerOneEmphasis"]', {
      timeout: 30000,
    }).should('be.visible');
    cy.get('.react-datepicker-wrapper button span', { timeout: 20000 }).then(
      span1 => {
        cy.wrap(span1)
          .invoke('text')
          .should('match', /^[A-Z][a-z]{2} \d{1,2}, \d{4}$/)
          .as('initialDate');
        cy.scrollLeft();
        cy.get('.react-datepicker-wrapper button span', {
          timeout: 20000,
        }).then(span => {
          cy.wrap(span)
            .invoke('text')
            .as('newDate')
            .then(function () {
              const secondDate = new Date(this.newDate).getDate();
              // we should only move by one day as EWS has data every day
              expect(
                new Date(
                  new Date(this.initialDate).getTime() - 60 * 60 * 24,
                ).getDate(),
              ).to.equal(secondDate);
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

    cy.wait('@getKoboDates', { timeout: 60000 });
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
    cy.scrollLeft();
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
