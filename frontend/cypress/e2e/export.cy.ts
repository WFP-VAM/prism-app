// run cypress tests with:
// - `yarn cypress open` to run interactively/debug
// - `npx cypress run` for a headless run (like in CI)

describe('Export View', () => {
  const frontendUrl = 'http://localhost:3000';
  it('renders all export components correctly from URL params', () => {
    // Load page with all URL params at once to test full functionality
    const exportUrl = new URL(`${frontendUrl}/export`);
    exportUrl.searchParams.set('hazardLayerIds', 'ndvi_dekad');
    exportUrl.searchParams.set('date', '2024-05-15');
    exportUrl.searchParams.set('title', 'Mozambique NDVI Export');
    exportUrl.searchParams.set('footer', 'Custom Footer Text');
    exportUrl.searchParams.set('footerVisibility', 'true');
    exportUrl.searchParams.set('legendVisibility', 'true');
    exportUrl.searchParams.set('logoVisibility', 'true');
    exportUrl.searchParams.set('mapWidth', '90');
    exportUrl.searchParams.set('bounds', '32,-27,41,-10');
    exportUrl.searchParams.set('zoom', '6');
    exportUrl.searchParams.set('logoPosition', '1');
    exportUrl.searchParams.set('logoScale', '1.5');
    exportUrl.searchParams.set('legendPosition', '1');
    exportUrl.searchParams.set('legendScale', '0.7');
    exportUrl.searchParams.set('footerTextSize', '16');

    cy.visit(exportUrl.toString());

    // ─────────────────────────────────────────────────────────────────────────
    // 1. MAP LOADS
    // ─────────────────────────────────────────────────────────────────────────
    cy.log('**Checking map loads**');
    cy.contains('MapTiler', { timeout: 30000 }).should('be.visible');

    // ─────────────────────────────────────────────────────────────────────────
    // 2. TITLE
    // ─────────────────────────────────────────────────────────────────────────
    cy.log('**Checking title**');
    cy.contains('Mozambique NDVI Export').should('be.visible');

    // ─────────────────────────────────────────────────────────────────────────
    // 3. LOGO
    // ─────────────────────────────────────────────────────────────────────────
    cy.log('**Checking logo**');
    cy.get('img[alt="logo"]').should('be.visible');

    // ─────────────────────────────────────────────────────────────────────────
    // 4. FOOTER
    // ─────────────────────────────────────────────────────────────────────────
    cy.log('**Checking footer**');
    cy.contains('Custom Footer Text').should('be.visible');
    cy.contains('Publication date').should('be.visible');
    cy.contains('Layer selection date').should('be.visible');

    // ─────────────────────────────────────────────────────────────────────────
    // 5. LEGEND
    // ─────────────────────────────────────────────────────────────────────────
    cy.log('**Checking legend**');
    // Legend should show the NDVI layer name
    cy.contains('NDVI', { matchCase: false }).should('be.visible');

    // ─────────────────────────────────────────────────────────────────────────
    // 6. NORTH ARROW
    // ─────────────────────────────────────────────────────────────────────────
    cy.log('**Checking north arrow**');
    cy.get('img[alt="northArrow"]').should('be.visible');

    // ─────────────────────────────────────────────────────────────────────────
    // 7. SCALE BAR
    // ─────────────────────────────────────────────────────────────────────────
    cy.log('**Checking scale bar**');
    cy.get('.maplibregl-ctrl-scale').should('exist');

    // ─────────────────────────────────────────────────────────────────────────
    // 8. MAP CONTAINER DIMENSIONS
    // ─────────────────────────────────────────────────────────────────────────
    cy.log('**Checking map container**');
    // Map container should exist and have reasonable dimensions
    cy.get('[class*="maplibregl-map"]').should('be.visible');
  });

  it('respects visibility toggle params', () => {
    // Test with visibility toggles turned off
    const exportUrl = new URL(`${frontendUrl}/export`);
    exportUrl.searchParams.set('hazardLayerIds', 'ndvi_dekad');
    exportUrl.searchParams.set('title', 'Hidden Elements Test');
    exportUrl.searchParams.set('legendVisibility', 'false');
    exportUrl.searchParams.set('footerVisibility', 'false');
    exportUrl.searchParams.set('logoVisibility', 'false');

    cy.visit(exportUrl.toString());

    // Wait for map to load
    cy.contains('MapTiler', { timeout: 30000 }).should('be.visible');

    // Title should still be visible
    cy.contains('Hidden Elements Test').should('be.visible');

    // Footer should NOT be visible (no Publication date text)
    cy.contains('Publication date').should('not.exist');

    // North arrow should still be visible (not controlled by toggles)
    cy.get('img[alt="northArrow"]').should('be.visible');
  });
});
