/// <reference types="cypress" />
// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })
//
// declare global {
//   namespace Cypress {
//     interface Chainable {
//       login(email: string, password: string): Chainable<void>
//       drag(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
//       dismiss(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
//       visit(originalFn: CommandOriginalFn, url: string, options: Partial<VisitOptions>): Chainable<Element>
//     }
//   }
// }
import { makeSafeIDFromTitle } from '../../src/components/MapView/LeftPanel/layersPanel/MenuItem/utils';

// a custom cypress command to activate a layer.
// args:
// group1 and group2: names of the groups as displayed in the app
// layerName: the name as shown next to the toggle
Cypress.Commands.add(
  'activateLayer',
  (group1: string, group2: string, layerName: string) => {
    cy.get(`#level1-${makeSafeIDFromTitle(group1)}`).then(el => {
      if (el[0].ariaExpanded === 'false') {
        cy.wrap(el).click();
      }
      cy.get(`#level2-${makeSafeIDFromTitle(group2)}`).then(el2 => {
        if (el2[0].ariaExpanded === 'false') {
          cy.wrap(el2).click();
        }
        cy.get(`[type="checkbox"][aria-label="${layerName}"]`).click();
      });
    });
  },
);

Cypress.Commands.add(
  'deactivateLayer',
  (group1: string, group2: string, layerName: string) => {
    // cy.get(`#level1-${makeSafeIDFromTitle(group1)}`).click();
    // cy.get(`#level2-${makeSafeIDFromTitle(group2)}`).click();
    cy.get(`[type="checkbox"][aria-label="${layerName}"]`).click();
  },
);

Cypress.Commands.add('switchLanguage', (langcode: string) => {
  cy.get('[aria-label="language-select-dropdown-button"]', {
    timeout: 10000,
  })
    .should('be.visible')
    .scrollIntoView()
    .click({ force: true });
  cy.get(
    `[aria-label="language-select-dropdown-menu-item-${langcode}"]`,
  )
    .should('be.visible')
    .click();
  cy.contains('Layers').should('be.visible');
});

Cypress.Commands.add('scrollLeft', () => {
  cy.get('button#chevronLeftButton').click();
});
Cypress.Commands.add('scrollRight', () => {
  cy.get('button#chevronRightButton').click();
});

/**
 * Wait for the map to be fully loaded and ready
 * This is more reliable than waiting for MapTiler attribution text
 * which can be slow to load or missing in CI environments
 */
Cypress.Commands.add('waitForMapLoad', (options = {}) => {
  const timeout = options.timeout || 30000;
  const bufferWait = options.bufferWait !== undefined ? options.bufferWait : 500;
  
  // Wait for the map canvas to be present and visible
  cy.get('.maplibregl-canvas', { timeout })
    .should('be.visible')
    .should('have.attr', 'width')
    .and('not.equal', '0');
  
  // Also wait for the map control container to ensure map is interactive
  cy.get('.maplibregl-control-container', { timeout: 5000 }).should('exist');
  
  // Small additional wait to ensure tiles have started loading
  if (bufferWait > 0) {
    cy.wait(bufferWait);
  }
});
