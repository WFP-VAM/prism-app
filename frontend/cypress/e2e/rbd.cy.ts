// run cypress tests on rbd
// these tests are likely to fail on other countries
// as they rely on certain layers being present

const frontendUrl = 'http://localhost:3000';

describe('Checks on dates', () => {
  it('should disable first layer when cadre harmonise overall phase classification plus rainfall forecast are activated', () => {
    cy.visit(frontendUrl);
    // specifying the resq package here is required for cy.react to work
    // see https://github.com/abhinaba-ghosh/cypress-react-selector/issues/320#issuecomment-1416634523
    cy.waitForReact('node_modules/resq/dist/index.js');
    cy.toggleLayer(
      'Cadre Harmonise',
      'Phase Classification',
      'Overall phase classification',
    );
    cy.url().should('include', 'baselineLayerId=ch_phase');

    // verify that the selected date is correct
    cy.get('.react-datepicker-wrapper button span').should(
      'have.text',
      'Sep 30, 2024',
    );
    cy.url().should('include', 'date=2024-09-30');

    cy.toggleLayer('Rainfall', 'Forecasts', 'Rolling daily rainfall forecast');

    cy.url().should('include', 'hazardLayerIds=daily_rainfall_forecast');
    cy.url().should('not.include', 'baselineLayerId=ch_phase');
    // cy.contains('No dates overlap with the selected layer').should('exist');
    cy.get('.MuiAlert-message').should('have.length', 2);
  });

  it('should select intersecting dates when cadre harmonise overall phase classification plus rainfall layers are activated', () => {
    cy.visit(frontendUrl);
    cy.waitForReact('node_modules/resq/dist/index.js');

    cy.toggleLayer('Rainfall', 'Rainfall Amount', 'Rainfall Aggregate');
    cy.url().should('include', 'date=');

    // check that the selected date is within the past month
    cy.get('.react-datepicker-wrapper button span.MuiButton-label').should(
      ddiv => {
        const d = new Date(ddiv.text());
        const today = new Date();
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(today.getMonth() - 1);

        expect(d).to.be.greaterThan(oneMonthAgo);
        expect(d).to.be.lte(today);
      },
    );

    cy.toggleLayer(
      'Cadre Harmonise',
      'Phase Classification',
      'Overall phase classification',
    );
    cy.url().should('include', 'baselineLayerId=ch_phase');
    cy.url().should('include', 'hazardLayerIds=rainfall_dekad');
    // CH layer has no data for 2025, it should select an available date
    cy.contains(
      'No data was found for layer "Overall phase classification" on',
    ).should('be.visible');
    cy.get('.react-datepicker-wrapper button span').should(
      'have.text',
      'Sep 30, 2024',
    );
    cy.url().should('include', 'date=2024-09-30');

    // user clicks a date for which there is no available data for CH
    cy.get('#dateTimelineSelector > div.MuiGrid-root')
      .children()
      .last()
      .click();

    cy.contains(
      'No data was found for layer "Overall phase classification" on',
    ).should(
      'include.text',
      'The closest date 2024-09-30 has been loaded instead',
    );
  });
});
