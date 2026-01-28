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
    const level1Id = `#level1-${makeSafeIDFromTitle(group1)}`;
    const level2Id = `#level2-${makeSafeIDFromTitle(group2)}`;
    const checkboxSelector = `[type="checkbox"][aria-label="${layerName}"]`;
    
    cy.log(`🔵 activateLayer: Looking for level1 element: ${level1Id}`);
    cy.get(level1Id).then(el => {
      cy.log(`🔵 activateLayer: Found level1 element, ariaExpanded: ${el[0].ariaExpanded}`);
      if (el[0].ariaExpanded === 'false') {
        cy.log(`🔵 activateLayer: Expanding level1: ${group1}`);
        cy.wrap(el).click();
      }
      cy.log(`🔵 activateLayer: Looking for level2 element: ${level2Id}`);
      cy.get(level2Id).then(el2 => {
        cy.log(`🔵 activateLayer: Found level2 element, ariaExpanded: ${el2[0].ariaExpanded}`);
        if (el2[0].ariaExpanded === 'false') {
          cy.log(`🔵 activateLayer: Expanding level2: ${group2}`);
          cy.wrap(el2).click();
        }
        cy.log(`🔵 activateLayer: Looking for checkbox: ${checkboxSelector}`);
        cy.get(checkboxSelector).then(checkbox => {
          cy.log(`🔵 activateLayer: Found checkbox, clicking to activate: ${layerName}`);
          cy.wrap(checkbox).click();
          cy.log(`✅ activateLayer: Successfully activated layer: ${layerName}`);
        });
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
  cy.log(`🔵 switchLanguage: Switching to language: ${langcode}`);
  cy.get('[aria-label="language-select-dropdown-button"]', {
    timeout: 10000,
  })
    .should('be.visible')
    .then(() => {
      cy.log('✅ switchLanguage: Language dropdown button found');
    })
    .scrollIntoView()
    .click({ force: true });
  cy.log(`🔵 switchLanguage: Looking for language option: ${langcode}`);
  cy.get(
    `[aria-label="language-select-dropdown-menu-item-${langcode}"]`,
  )
    .should('be.visible')
    .then(() => {
      cy.log(`✅ switchLanguage: Language option ${langcode} found`);
    })
    .click();
  cy.log('🔵 switchLanguage: Waiting for "Layers" text');
  cy.contains('Layers').should('be.visible');
  cy.log(`✅ switchLanguage: Successfully switched to ${langcode}`);
});

Cypress.Commands.add('scrollLeft', () => {
  cy.get('button#chevronLeftButton').click();
});
Cypress.Commands.add('scrollRight', () => {
  cy.get('button#chevronRightButton').click();
});
