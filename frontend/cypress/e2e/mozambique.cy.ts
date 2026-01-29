// run cypress tests with:
// - `yarn cypress open` to run interactively/debug
// - `npx cypress run` for a headless run (like in CI)
const frontendUrl = 'http://localhost:3000';

describe('Loading layers', () => {
  // sample test that runs on Mozambique
  it('checks that dates are loaded', () => {
    cy.log('🔵 Starting test: checks that dates are loaded');
    cy.log(`🔵 Visiting: ${frontendUrl}`);
    cy.visit(frontendUrl);
    
    cy.log('🔵 Waiting for page to load...');
    cy.window().then((win) => {
      cy.log(`🔵 Window location: ${win.location.href}`);
      cy.log(`🔵 Document ready state: ${win.document.readyState}`);
    });

    cy.log('🔵 Activating layer: Rainfall > INAM Rainfall Data > Rainfall aggregate');
    cy.activateLayer('Rainfall', 'INAM Rainfall Data', 'Rainfall aggregate');

    cy.log('🔵 Checking URL contains hazardLayerIds=precip_blended_dekad');
    cy.url().should('include', 'hazardLayerIds=precip_blended_dekad');
    cy.url().then((url) => {
      cy.log(`✅ URL check passed: ${url}`);
    });
  });
});

describe('Loading dates', () => {
  it('switching to AA from rainfall layer should load latest data', () => {
    const testUrl = `${frontendUrl}/?hazardLayerIds=rainfall_dekad&date=2025-09-01`;
    cy.log('🔵 Starting test: switching to AA from rainfall layer');
    cy.log(`🔵 Visiting: ${testUrl}`);
    cy.visit(testUrl);

    cy.log('🔵 Waiting for MapTiler to be visible (timeout: 20000ms)');
    cy.contains('MapTiler', { timeout: 20000 }).should('be.visible');
    cy.log('✅ MapTiler is visible');

    cy.log('🔵 Looking for date picker (timeout: 20000ms)');
    cy.get('.react-datepicker-wrapper button span', { timeout: 20000 }).then(
      span1 => {
        const dateText = span1.text();
        cy.log(`🔵 Found date picker with text: "${dateText}"`);
        cy.wrap(span1)
          .invoke('text')
          .should('match', /^Sep 1, 2025$/)
          .as('initialDate');
        cy.log('✅ Initial date matches expected format');
      },
    );
    
    cy.log('🔵 Clicking on A. Actions header');
    cy.get('header').contains('A. Actions').click();
    cy.log('✅ A. Actions clicked');
    
    cy.log('🔵 Clicking on A. Action Flood');
    cy.get('div.MuiPopover-paper').contains('A. Action Flood').click();
    cy.log('✅ A. Action Flood clicked');
    
    cy.log('🔵 Waiting for date picker to update (timeout: 20000ms)');
    cy.get('.react-datepicker-wrapper button span', { timeout: 20000 }).then(
      span1 => {
        const dateText = span1.text();
        cy.log(`🔵 Found updated date picker with text: "${dateText}"`);
        cy.wrap(span1)
          .invoke('text')
          .should('match', /^[A-Z][a-z]{2} \d{1,2}, \d{4}$/)
          .as('aaDate')
          .then(function () {
            const firstDate = new Date(this.initialDate).getTime();
            const secondDate = new Date(this.aaDate).getTime();
            cy.log(`🔵 Comparing dates: ${this.initialDate} (${firstDate}) vs ${this.aaDate} (${secondDate})`);
            expect(secondDate).to.be.greaterThan(firstDate);
            cy.log('✅ Date comparison passed - AA date is newer');
          });
      },
    );
    
    cy.log('🔵 Looking for Gauge station text (timeout: 10000ms)');
    cy.get('#full-width-tabpanel-anticipatory_action_flood')
      .contains('Gauge station', { timeout: 10000 })
      .should('be.visible');
    cy.log('✅ Gauge station is visible');
  });
});
