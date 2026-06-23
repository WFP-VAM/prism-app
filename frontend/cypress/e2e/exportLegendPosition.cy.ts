// Verifies legend position handling in the map export, in particular that a
// bottom-right legend pushes the north arrow AND scale bar to the bottom-left,
// with the scale bar staying directly beneath the north arrow.

describe('Export legend position', () => {
  const frontendUrl = 'http://localhost:3000';

  // Same layer/bounds as export.cy.ts so this runs in the same CI context.
  const buildUrl = (legendPosition: string) => {
    const url = new URL(`${frontendUrl}/export`);
    url.searchParams.set('hazardLayerIds', 'ndvi_dekad');
    url.searchParams.set('date', '2024-05-15');
    url.searchParams.set('bounds', '32,-27,41,-10');
    url.searchParams.set('legendVisibility', 'true');
    url.searchParams.set('legendPosition', legendPosition);
    return url.toString();
  };

  it('keeps the scale bar directly beneath the north arrow on the bottom-left for a bottom-right legend', () => {
    cy.visit(buildUrl('3')); // 3 = bottom-right legend

    cy.get('.maplibregl-canvas', { timeout: 60000 }).should('exist');
    cy.get('.maplibregl-ctrl-scale', { timeout: 60000 }).should('exist');

    // Scale bar is relocated out of MapLibre's control group into our anchor.
    cy.get('[data-testid="scale-anchor"] .maplibregl-ctrl-scale').should(
      'exist',
    );

    cy.get('.layout-ltr')
      .then($c => $c[0].getBoundingClientRect())
      .then(cont => {
        cy.get('img[alt="northArrow"]')
          .then($n => $n[0].getBoundingClientRect())
          .then(arrow => {
            cy.get('.maplibregl-ctrl-scale')
              .then($s => $s[0].getBoundingClientRect())
              .then(scale => {
                // Both controls sit in the left half of the map.
                expect(arrow.left - cont.left).to.be.lessThan(cont.width / 2);
                expect(scale.left - cont.left).to.be.lessThan(cont.width / 2);
                // Scale bar sits below the north arrow...
                expect(scale.top).to.be.greaterThan(arrow.top);
                // ...and shares its left edge (glued directly beneath it).
                expect(Math.abs(scale.left - arrow.left)).to.be.lessThan(20);
              });
          });
      });
  });

  it('keeps the scale bar and north arrow on the bottom-right for a top legend', () => {
    cy.visit(buildUrl('1')); // 1 = top-right legend (default corner for controls)

    cy.get('.maplibregl-canvas', { timeout: 60000 }).should('exist');
    cy.get('.maplibregl-ctrl-scale', { timeout: 60000 }).should('exist');

    cy.get('.layout-ltr')
      .then($c => $c[0].getBoundingClientRect())
      .then(cont => {
        cy.get('img[alt="northArrow"]')
          .then($n => $n[0].getBoundingClientRect())
          .then(arrow => {
            cy.get('.maplibregl-ctrl-scale')
              .then($s => $s[0].getBoundingClientRect())
              .then(scale => {
                // Both controls sit in the right half of the map.
                expect(arrow.right - cont.left).to.be.greaterThan(
                  cont.width / 2,
                );
                expect(scale.right - cont.left).to.be.greaterThan(
                  cont.width / 2,
                );
                expect(scale.top).to.be.greaterThan(arrow.top);
                expect(Math.abs(scale.right - arrow.right)).to.be.lessThan(20);
              });
          });
      });
  });
});
