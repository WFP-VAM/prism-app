// run cypress tests on rbd
// these tests are likely to fail on other countries
// as they rely on certain layers being present

const frontendUrl = 'http://localhost:3000';

describe('General stability', () => {
  it('should open with specific analysis settings without hanging', () => {
    cy.visit(
      `${frontendUrl}/?analysisHazardLayerId=dekad_rainfall_forecast&analysisBaselineLayerId=admin1_boundaries&analysisDate=2025-08-11&analysisStatistic=mean`,
    );
    cy.contains('Rainfall').should('be.visible');
    cy.contains('MapTiler', { timeout: 10000 }).should('be.visible');
  });
});

describe('Checks on dates', () => {
  it('should disable first layer when cadre harmonise overall phase classification plus rainfall forecast are activated', () => {
    cy.visit(frontendUrl);
    // specifying the resq package here is required for cy.react to work
    // see https://github.com/abhinaba-ghosh/cypress-react-selector/issues/320#issuecomment-1416634523
    cy.activateLayer(
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

    cy.activateLayer(
      'Rainfall',
      'Forecasts',
      'Rolling daily rainfall forecast',
    );

    cy.url().should('include', 'hazardLayerIds=daily_rainfall_forecast');
    cy.url().should('not.include', 'baselineLayerId=ch_phase');
    // cy.contains('No dates overlap with the selected layer').should('exist');
    cy.get('.MuiAlert-message').should('have.length', 2);
  });

  it('should select intersecting dates when cadre harmonise overall phase classification plus rainfall layers are activated', () => {
    cy.visit(frontendUrl);

    cy.activateLayer('Rainfall', 'Rainfall Amount', 'Rainfall Aggregate');
    cy.url({ timeout: 20000 }).should('include', 'date=');

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

    cy.activateLayer(
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
    cy.get('.react-datepicker-wrapper button span', { timeout: 15000 }).should(
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

  it('should scroll to the "smaller" intervals when multiple layers are selected', () => {
    // mock tiles as we don't really need them here
    cy.intercept(
      {
        method: 'GET',
        url: /^https:\/\/api\.earthobservation\.vam\.wfp\.org\/ows\/\/wms\?bboxsr=.*/,
      },
      { fixture: 'mocks/vam_empty_tile.png' },
    ).as('mockVAMtiles');

    cy.visit(
      `${frontendUrl}/?hazardLayerIds=rainfall_agg_3month&date=2024-02-07&baselineLayerId=ch_phase`,
    );
    cy.get('.react-datepicker-wrapper button span', { timeout: 15000 }).should(
      'have.text',
      'Feb 7, 2024',
    );
    // wait for both layers to be loaded, so we scroll as expected
    cy.get('#level1-Rainfall .MuiChip-label', { timeout: 30000 }).should(
      'have.text',
      '1',
    );

    cy.scrollLeft();
    cy.get('.react-datepicker-wrapper button span', { timeout: 15000 }).should(
      'have.text',
      'Feb 1, 2024',
    );
    cy.url().should('include', 'date=2024-02-01');

    cy.scrollLeft();
    cy.get('.react-datepicker-wrapper button span', { timeout: 15000 }).should(
      'have.text',
      'Jan 21, 2024',
    );
    cy.url().should('include', 'date=2024-01-21');

    cy.scrollRight();
    cy.get('.react-datepicker-wrapper button span', { timeout: 15000 }).should(
      'have.text',
      'Feb 1, 2024',
    );
    cy.url().should('include', 'date=2024-02-01');

    cy.scrollRight();
    cy.get('.react-datepicker-wrapper button span', { timeout: 15000 }).should(
      'have.text',
      'Feb 11, 2024',
    );
    cy.url().should('include', 'date=2024-02-11');
  });
});
